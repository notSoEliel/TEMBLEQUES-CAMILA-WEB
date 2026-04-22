import { Hono } from "hono";
import { Product } from "../models/Product.js";
import { getBookedDates } from "../services/availability.js";
import { AppError } from "../lib/errors.js";

const products = new Hono();

// GET /api/products - List with filters
products.get("/", async (c) => {
  const { category, size, minPrice, maxPrice, status, search } = c.req.query();

  const filter: any = {};

  if (category) filter.category = category;
  if (size) filter.size = size;
  if (status) filter.condition_status = status;
  if (minPrice || maxPrice) {
    filter.rental_price = {};
    if (minPrice) filter.rental_price.$gte = Number(minPrice);
    if (maxPrice) filter.rental_price.$lte = Number(maxPrice);
  }
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const productsList = await Product.find(filter).sort({ createdAt: -1 });
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

