import { Hono } from "hono";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { getBookedDates } from "../services/availability.js";
import { AppError } from "../lib/errors.js";

const products = new Hono();

// GET /api/products - List with filters
products.get("/", async (c) => {
  const { minPrice, maxPrice, search, startDate, endDate } = c.req.query();
  const sizes = c.req.queries("size");
  const categories = c.req.queries("category");

  const filter: any = {};

  if (categories && categories.length > 0) filter.category = { $in: categories };
  if (sizes && sizes.length > 0) filter["variants.size"] = { $in: sizes };
  if (minPrice || maxPrice) {
    filter.rental_price = {};
    if (minPrice) filter.rental_price.$gte = Number(minPrice);
    if (maxPrice) filter.rental_price.$lte = Number(maxPrice);
  }
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  let productsList = await Product.find(filter).sort({ createdAt: -1 });

  if (startDate && endDate) {
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

    productsList = productsList.filter((product) => {
      const pid = product._id.toString();
      const pConflicts = conflicts[pid] || {};

      return product.variants.some((v) => {
        if (sizes && sizes.length > 0 && !sizes.includes(v.size)) return false;
        if (v.in_maintenance || v.stock <= 0) return false;

        const conflictingCount = pConflicts[v.size] || 0;
        return conflictingCount < v.stock;
      });
    });
  }

  return c.json({ products: productsList });
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
