import { Hono } from "hono";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { getBookedDates } from "../services/availability.js";
import { AppError } from "../lib/errors.js";
import { getPaginationParams, createPaginatedResponse } from "../lib/pagination.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const products = new Hono();

// GET /api/products - List with filters
products.get("/", async (c) => {
  const { minPrice, maxPrice, search, startDate, endDate } = c.req.query();
  const sizes = c.req.queries("size");
  const categories = c.req.queries("category");
  const { page, limit, skip } = getPaginationParams(c);

  const filter: any = {};

  if (categories && categories.length > 0) filter.category = { $in: categories };
  if (sizes && sizes.length > 0) filter["variants.size"] = { $in: sizes };
  if (minPrice || maxPrice) {
    filter.rental_price = {};
    if (minPrice) filter.rental_price.$gte = Number(minPrice);
    if (maxPrice) filter.rental_price.$lte = Number(maxPrice);
  }
  if (search) {
    const expression = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: expression }, { name_en: expression }];
  }

  // If there's NO date filter, we can paginate directly in the DB
  if (!startDate || !endDate) {
    const [productsList, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return c.json(createPaginatedResponse(productsList, total, page, limit));
  }

  // If there IS a date filter, we currently filter in memory
  // Optimization: Still use initial DB filter
  const allMatchingProducts = await Product.find(filter).sort({ createdAt: -1 });

  const start = new Date(startDate);
  const end = new Date(endDate);

  const rentals = await Rental.find({
    status: { $nin: ["cancelled", "returned", "damaged"] },
    start_date: { $lte: end },
    end_date: { $gte: start },
  }).select("product_id selected_size");

  const conflicts: Record<string, Record<string, number>> = {};
  for (const r of rentals) {
    const pid = r.product_id.toString();
    const sz = r.selected_size || "Único";
    if (!conflicts[pid]) conflicts[pid] = {};
    conflicts[pid][sz] = (conflicts[pid][sz] || 0) + 1;
  }

  const filteredProducts = allMatchingProducts.filter((product) => {
    const pid = product._id.toString();
    const pConflicts = conflicts[pid] || {};

    return product.variants.some((v) => {
      if (sizes && sizes.length > 0 && !sizes.includes(v.size)) return false;
      if (v.in_maintenance || v.stock <= 0) return false;

      const conflictingCount = pConflicts[v.size] || 0;
      return conflictingCount < v.stock;
    });
  });

  const paginatedList = filteredProducts.slice(skip, skip + limit);
  return c.json(createPaginatedResponse(paginatedList, filteredProducts.length, page, limit));
});

// GET /api/products/:id - Single product
products.get("/:id", async (c) => {
  const product = await Product.findById(c.req.param("id"));
  if (!product) {
    throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
  }
  return c.json({ product });
});

// GET /api/products/:id/availability - Booked dates
products.get("/:id/availability", async (c) => {
  const productId = c.req.param("id");
  const { from, to } = c.req.query();

  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const booked = await getBookedDates(productId, fromDate, toDate);
  return c.json({ booked });
});

export default products;
