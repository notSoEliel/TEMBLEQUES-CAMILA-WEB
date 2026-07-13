import { Hono } from "hono";
import mongoose from "mongoose";
import { z } from "zod";
import { authMiddleware, requireAdmin, type AuthVariables } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { Contact, type ContactStatus } from "../models/Contact.js";
import { TermsAcceptance } from "../models/TermsAcceptance.js";
import { updateRentalStatus } from "../services/rental.js";
import { generateRentalContractPdf } from "../services/contracts.js";
import { AppError } from "../lib/errors.js";
import { getPanamaTodayUTC } from "../services/payment-rules.js";
import { getPaginationParams, createPaginatedResponse } from "../lib/pagination.js";

const admin = new Hono<{ Variables: AuthVariables }>();

// All admin routes require auth + admin role
admin.use("/*", authMiddleware, requireAdmin);

const contactStatusSchema = z.enum(["unread", "read", "archived"]);

// GET /api/admin/seed-status - Read-only verification of the managed seed namespace
admin.get("/seed-status", async (c) => {
  const seedRentals = await Rental.find({ fixture_key: { $exists: true } }).select("_id").lean();
  const seedRentalIds = seedRentals.map((rental) => rental._id);

  const [products, rentals, users, termsAcceptances] = await Promise.all([
    Product.countDocuments({ seed_key: { $exists: true } }),
    Rental.countDocuments({ fixture_key: { $exists: true } }),
    User.countDocuments({ clerkId: { $regex: /^seed_/ } }),
    TermsAcceptance.countDocuments({ rental_id: { $in: seedRentalIds } }),
  ]);

  return c.json({
    environment: process.env.APP_ENV ?? "unknown",
    seed: {
      enabled: process.env.SEED_ENABLED === "true",
      profile: process.env.SEED_PROFILE ?? "unknown",
      mode: process.env.SEED_MODE ?? "unknown",
      namespace: {
        products,
        rentals,
        users,
        termsAcceptances,
      },
    },
  });
});

// GET /api/admin/dashboard - KPIs
admin.get("/dashboard", async (c) => {
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
    possibleLateReturns,
    statusBreakdown,
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
          status: { $nin: ["cancelled"] },
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
    Rental.find({
      status: "delivered",
      end_date: { $lt: getPanamaTodayUTC() },
    })
      .populate("product_id", "name")
      .populate("user_id", "name email")
      .limit(10),
    Rental.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown: Record<string, number> = {
    pending: 0,
    paid: 0,
    confirmed: 0,
    delivered: 0,
    returned: 0,
    late: 0,
    damaged: 0,
  };
  statusBreakdown.forEach((s: any) => {
    if (breakdown[s._id] !== undefined) breakdown[s._id] = s.count;
  });

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
      possibleLateReturns,
      statusBreakdown: breakdown,
    },
  });
});

// --- Product CRUD ---

const sizeVariantSchema = z.object({
  size: z.string().min(1, "El nombre de la talla es requerido"),
  stock: z.number().min(0, "El stock no puede ser negativo"),
  price_override: z.number().min(0).optional().nullable(),
  in_maintenance: z.boolean().default(false),
});

const productSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido"),
  name_en: z.string().optional(),
  description: z.string().min(1, "La descripción es requerida"),
  description_en: z.string().optional(),
  category: z.array(
    z.enum(["pollera", "vestuario_masculino", "infantil", "tembleques", "accesorios", "paquete_completo"])
  ).min(1, "Al menos una categoría es requerida"),
  rental_price: z.number().min(0, "El precio no puede ser negativo"),
  variants: z.array(sizeVariantSchema).min(1, "Debe haber al menos una talla/variante"),
  images: z.array(z.string()).optional(),
  deposit_settings: z.object({
    required: z.boolean().default(false),
    overrideAmount: z.number().min(0).optional().nullable(),
  }).optional(),
});

// POST /api/admin/products
admin.post("/products", async (c) => {
  const body = await c.req.json();
  const data = productSchema.parse(body); // ZodError → global handler

  // Clean up null price_override values
  const cleanedVariants = data.variants.map((v) => ({
    ...v,
    price_override: v.price_override ?? undefined,
  }));

  const product = await Product.create({ ...data, variants: cleanedVariants });
  return c.json({ product }, 201);
});

// PUT /api/admin/products/:id
admin.put("/products/:id", async (c) => {
  const body = await c.req.json();
  const data = productSchema.partial().parse(body); // ZodError → global handler

  // Clean up null price_override values if variants are being updated
  if (data.variants) {
    data.variants = data.variants.map((v) => ({
      ...v,
      price_override: v.price_override ?? undefined,
    }));
  }

  const product = await Product.findByIdAndUpdate(c.req.param("id"), data, { new: true });
  if (!product) {
    throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
  }
  return c.json({ product });
});

// DELETE /api/admin/products/:id
admin.delete("/products/:id", async (c) => {
  const product = await Product.findByIdAndDelete(c.req.param("id"));
  if (!product) {
    throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");
  }
  return c.json({ message: "Producto eliminado correctamente" });
});

// --- Rental Management ---

// GET /api/admin/rentals
admin.get("/rentals", async (c) => {
  const { status, sort } = c.req.query();
  const { page, limit, skip } = getPaginationParams(c);
  const filter: any = {};
  if (status) filter.status = status;

  const sortOrder = sort === "asc" ? 1 : -1;

  const [allRentals, total] = await Promise.all([
    Rental.find(filter)
      .populate("user_id", "name email phone preferredAddress")
      .populate("product_id", "name category images")
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit),
    Rental.countDocuments(filter),
  ]);

  return c.json(createPaginatedResponse(allRentals, total, page, limit));
});

// GET /api/admin/rentals/calendar
admin.get("/rentals/calendar", async (c) => {
  const { from, to } = c.req.query();
  
  if (!from || !to) {
    throw new AppError("Las fechas 'from' y 'to' son requeridas", 400, "VALIDATION_ERROR");
  }

  const filter = {
    $or: [
      { start_date: { $gte: new Date(from), $lte: new Date(to) } },
      { end_date: { $gte: new Date(from), $lte: new Date(to) } },
      {
        start_date: { $lte: new Date(from) },
        end_date: { $gte: new Date(to) },
      },
    ],
  };

  const rentals = await Rental.find(filter)
    .populate("user_id", "name email phone")
    .populate("product_id", "name category images")
    .sort({ start_date: 1 });

  return c.json({ data: rentals });
});

// GET /api/admin/rentals/:id/contract.pdf
admin.get("/rentals/:id/contract.pdf", async (c) => {
  const pdf = await generateRentalContractPdf(c.req.param("id"));
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-${c.req.param("id")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});

// PATCH /api/admin/rentals/:id/status
admin.patch("/rentals/:id/status", async (c) => {
  const { status } = await c.req.json();
  if (!status) {
    throw new AppError("El nuevo estado es requerido", 400, "RENTAL_STATUS_REQUIRED");
  }
  // updateRentalStatus throws AppError with specific messages on invalid transitions
  const rental = await updateRentalStatus(c.req.param("id"), status);
  return c.json({ rental });
});

// --- User Management ---

// GET /api/admin/users
admin.get("/users", async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const filter = { role: "client" };

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return c.json(createPaginatedResponse(users, total, page, limit));
});

// GET /api/admin/users/:id
admin.get("/users/:id", async (c) => {
  const user = await User.findById(c.req.param("id"));
  if (!user) {
    throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  }
  return c.json({ user });
});

// GET /api/admin/users/:id/rentals
admin.get("/users/:id/rentals", async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const { status } = c.req.query();
  const filter: any = { user_id: c.req.param("id") };
  if (status) filter.status = status;

  const [userRentals, total] = await Promise.all([
    Rental.find(filter)
      .populate("product_id", "name category images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Rental.countDocuments(filter),
  ]);

  return c.json(createPaginatedResponse(userRentals, total, page, limit));
});

// GET /api/admin/users/:id/stats
admin.get("/users/:id/stats", async (c) => {
  const userId = c.req.param("id");
  const [total, cancelled, pending, reserved, spentResult] = await Promise.all([
    Rental.countDocuments({ user_id: userId }),
    Rental.countDocuments({ user_id: userId, status: "cancelled" }),
    Rental.countDocuments({ user_id: userId, status: "pending" }),
    Rental.countDocuments({ user_id: userId, status: { $in: ["reserved", "confirmed"] } }),
    Rental.aggregate([
      { 
        $match: { 
          user_id: new mongoose.Types.ObjectId(userId), 
          payment_status: "completed", 
          status: { $nin: ["cancelled", "pending"] } 
        } 
      },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ])
  ]);

  return c.json({
    stats: { total, cancelled, pending, reserved, totalSpent: spentResult[0]?.total || 0 },
  });
});

// GET /api/admin/users/:id/audit
admin.get("/users/:id/audit", async (c) => {
  const userId = c.req.param("id");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  }

  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [user, statusBreakdown, spentResult, balanceResult, lastRental, termsCount] = await Promise.all([
    User.findById(userId),
    Rental.aggregate([
      { $match: { user_id: objectUserId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Rental.aggregate([
      {
        $match: {
          user_id: objectUserId,
          payment_status: "completed",
          status: { $nin: ["cancelled", "pending"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Rental.aggregate([
      { $match: { user_id: objectUserId, status: { $nin: ["cancelled", "returned", "damaged"] } } },
      { $group: { _id: null, total: { $sum: "$balance_due" } } },
    ]),
    Rental.findOne({ user_id: userId })
      .populate("product_id", "name category images")
      .sort({ createdAt: -1 }),
    TermsAcceptance.countDocuments({ user_id: userId }),
  ]);

  if (!user) {
    throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  }

  const counts: Record<string, number> = {
    pending: 0,
    reserved: 0,
    paid: 0,
    confirmed: 0,
    delivered: 0,
    returned: 0,
    late: 0,
    damaged: 0,
    cancelled: 0,
  };

  statusBreakdown.forEach((item: { _id: string; count: number }) => {
    if (counts[item._id] !== undefined) counts[item._id] = item.count;
  });

  const incidents = counts.late + counts.damaged;
  const completed = counts.returned + counts.damaged;
  const totalRentals = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const trustLevel =
    incidents === 0 && totalRentals >= 3
      ? "alto"
      : incidents <= 1 && counts.cancelled <= 1
        ? "medio"
        : "requiere_revision";

  return c.json({
    audit: {
      totalRentals,
      completed,
      active: counts.reserved + counts.paid + counts.confirmed + counts.delivered,
      pending: counts.pending,
      cancelled: counts.cancelled,
      late: counts.late,
      damaged: counts.damaged,
      incidents,
      termsAccepted: termsCount,
      totalSpent: spentResult[0]?.total || 0,
      outstandingBalance: balanceResult[0]?.total || 0,
      trustLevel,
      lastRental,
      statusBreakdown: counts,
    },
  });
});

// --- Contact Management ---

// GET /api/admin/contacts
admin.get("/contacts", async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const status = c.req.query("status");
  const filter: { status?: ContactStatus } = {};

  if (status) {
    const parsed = contactStatusSchema.safeParse(status);
    if (!parsed.success) {
      throw new AppError("Estado de contacto inválido", 400, "VALIDATION_ERROR");
    }
    filter.status = parsed.data;
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter),
  ]);

  return c.json(createPaginatedResponse(contacts, total, page, limit));
});

const updateContactStatusSchema = z.object({
  status: contactStatusSchema,
});

// PATCH /api/admin/contacts/:id/status
admin.patch("/contacts/:id/status", async (c) => {
  const body = await c.req.json();
  const { status } = updateContactStatusSchema.parse(body);

  const contact = await Contact.findByIdAndUpdate(c.req.param("id"), { status }, { new: true });
  if (!contact) {
    throw new AppError("Mensaje de contacto no encontrado", 404, "CONTACT_NOT_FOUND");
  }

  return c.json({ contact });
});

export default admin;
