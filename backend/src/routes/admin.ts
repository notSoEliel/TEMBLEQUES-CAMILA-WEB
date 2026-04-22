import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { updateRentalStatus } from "../services/rental.js";

const admin = new Hono();

// All admin routes require auth + admin role
admin.use("/*", authMiddleware, requireAdmin);

// GET /api/admin/dashboard - KPIs
admin.get("/dashboard", async (c) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeRentals,
      upcomingReturns,
      monthlyRevenue,
      topProducts,
      totalUsers,
      totalProducts,
      damagedCount,
    ] = await Promise.all([
      Rental.countDocuments({ status: { $in: ["paid", "confirmed", "delivered"] } }),
      Rental.find({
        status: "delivered",
        end_date: { $gte: now, $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      })
        .populate("product_id", "name")
        .populate("user_id", "name email")
        .limit(10),
      Rental.aggregate([
        {
          $match: {
            payment_status: "completed",
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Rental.aggregate([
        { $match: { status: { $nin: ["cancelled"] } } },
        { $group: { _id: "$product_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
      ]),
      User.countDocuments({ role: "client" }),
      Product.countDocuments(),
      Rental.countDocuments({ status: "damaged" }),
    ]);

    return c.json({
      dashboard: {
        activeRentals,
        upcomingReturns,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        topProducts: topProducts.map((tp: any) => ({
          name: tp.product.name,
          count: tp.count,
        })),
        totalUsers,
        totalProducts,
        damagedCount,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Error en dashboard" }, 500);
  }
});

// --- Product CRUD ---

const productSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["pollera", "vestuario_masculino", "infantil", "tembleques", "accesorios", "paquete_completo"]),
  description: z.string().min(1),
  rental_price: z.number().min(0),
  stock: z.number().min(0).optional(),
  condition_status: z.enum(["disponible", "mantenimiento", "alquilado"]).optional(),
  size: z.string().optional(),
  images: z.array(z.string()).optional(),
});

// POST /api/admin/products
admin.post("/products", async (c) => {
  try {
    const body = await c.req.json();
    const data = productSchema.parse(body);
    const product = await Product.create(data);
    return c.json({ product }, 201);
  } catch (error: any) {
    if (error.issues) return c.json({ error: error.issues[0].message }, 400);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/products/:id
admin.put("/products/:id", async (c) => {
  try {
    const body = await c.req.json();
    const data = productSchema.partial().parse(body);
    const product = await Product.findByIdAndUpdate(c.req.param("id"), data, { new: true });
    if (!product) return c.json({ error: "Producto no encontrado" }, 404);
    return c.json({ product });
  } catch (error: any) {
    if (error.issues) return c.json({ error: error.issues[0].message }, 400);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/admin/products/:id
admin.delete("/products/:id", async (c) => {
  try {
    const product = await Product.findByIdAndDelete(c.req.param("id"));
    if (!product) return c.json({ error: "Producto no encontrado" }, 404);
    return c.json({ message: "Producto eliminado" });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// --- Rental Management ---

// GET /api/admin/rentals
admin.get("/rentals", async (c) => {
  try {
    const { status } = c.req.query();
    const filter: any = {};
    if (status) filter.status = status;

    const allRentals = await Rental.find(filter)
      .populate("user_id", "name email phone")
      .populate("product_id", "name category images")
      .sort({ createdAt: -1 });
    return c.json({ rentals: allRentals });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/admin/rentals/:id/status
admin.patch("/rentals/:id/status", async (c) => {
  try {
    const { status } = await c.req.json();
    const rental = await updateRentalStatus(c.req.param("id"), status);
    return c.json({ rental });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// --- User Management ---

// GET /api/admin/users
admin.get("/users", async (c) => {
  try {
    const users = await User.find({ role: "client" }).select("-password").sort({ createdAt: -1 });
    return c.json({ users });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/admin/users/:id/rentals
admin.get("/users/:id/rentals", async (c) => {
  try {
    const userRentals = await Rental.find({ user_id: c.req.param("id") })
      .populate("product_id", "name category images")
      .sort({ createdAt: -1 });
    return c.json({ rentals: userRentals });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default admin;
