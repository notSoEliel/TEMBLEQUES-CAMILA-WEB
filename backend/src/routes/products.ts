import { Hono } from "hono";
import { Product } from "../models/Product.js";
import { getBookedDates } from "../services/availability.js";

const products = new Hono();

// GET /api/products - List with filters
products.get("/", async (c) => {
  try {
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
  } catch (error: any) {
    return c.json({ error: error.message || "Error al obtener productos" }, 500);
  }
});

// GET /api/products/:id - Single product
products.get("/:id", async (c) => {
  try {
    const product = await Product.findById(c.req.param("id"));
    if (!product) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }
    return c.json({ product });
  } catch (error: any) {
    return c.json({ error: error.message || "Error al obtener producto" }, 500);
  }
});

// GET /api/products/:id/availability - Booked dates
products.get("/:id/availability", async (c) => {
  try {
    const productId = c.req.param("id");
    const { from, to } = c.req.query();

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const booked = await getBookedDates(productId, fromDate, toDate);
    return c.json({ booked });
  } catch (error: any) {
    return c.json({ error: error.message || "Error al obtener disponibilidad" }, 500);
  }
});

export default products;
