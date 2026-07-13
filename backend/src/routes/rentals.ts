import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { createRental } from "../services/rental.js";
import { AppError } from "../lib/errors.js";
import { getPaginationParams, createPaginatedResponse } from "../lib/pagination.js";

const rentals = new Hono<{ Variables: AuthVariables }>();

// All rental routes require authentication
rentals.use("/*", authMiddleware);

const createRentalSchema = z.object({
  productId: z.string().min(1, "El ID del producto es requerido"),
  selectedSize: z.string().min(1, "La talla es requerida"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  termsAccepted: z.boolean(),
  paymentType: z.enum(["reservation", "full"]).default("reservation"),
  orderGroupId: z.string().optional(),
});

const bulkCreateRentalSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, "El ID del producto es requerido"),
    selectedSize: z.string().min(1, "La talla es requerida"),
    startDate: z.string().min(1, "La fecha de inicio es requerida"),
    endDate: z.string().min(1, "La fecha de fin es requerida"),
    termsAccepted: z.boolean(),
    paymentType: z.enum(["reservation", "full"]).default("reservation"),
  })).min(1, "El carrito no puede estar vacío"),
});

// POST /api/rentals - Create reservation
rentals.post("/", async (c) => {
  const body = await c.req.json();
  const data = createRentalSchema.parse(body); // ZodError → global handler
  const user = c.get("user") as any;

  const orderGroupId = data.orderGroupId || crypto.randomUUID();

  const rental = await createRental({
    userId: user._id.toString(),
    productId: data.productId,
    selectedSize: data.selectedSize,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    termsAccepted: data.termsAccepted,
    paymentType: data.paymentType,
    orderGroupId,
    ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
  });

  return c.json({ rental }, 201);
});

// POST /api/rentals/bulk - Create multiple reservations
rentals.post("/bulk", async (c) => {
  const body = await c.req.json();
  const { items } = bulkCreateRentalSchema.parse(body);
  const user = c.get("user") as any;

  const orderGroupId = crypto.randomUUID();

  const results = await Promise.all(items.map(async (item) => {
    return createRental({
      userId: user._id.toString(),
      productId: item.productId,
      selectedSize: item.selectedSize,
      startDate: new Date(item.startDate),
      endDate: new Date(item.endDate),
      termsAccepted: item.termsAccepted,
      paymentType: item.paymentType,
      orderGroupId,
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
    });
  }));

  return c.json({ rentals: results }, 201);
});

// GET /api/rentals/my - My reservations
rentals.get("/my", async (c) => {
  const user = c.get("user") as any;
  const { page, limit, skip } = getPaginationParams(c);
  const view = c.req.query("view") || "active";
  
  const filter: any = { user_id: user._id };
  if (view === "cancelled") {
    filter.status = "cancelled";
  } else {
    filter.status = { $ne: "cancelled" };
  }

  const [myRentals, total] = await Promise.all([
    Rental.find(filter)
      .populate("product_id", "name category images rental_price variants")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Rental.countDocuments(filter),
  ]);

  return c.json(createPaginatedResponse(myRentals, total, page, limit));
});

// GET /api/rentals/:id - Single rental
rentals.get("/:id", async (c) => {
  const user = c.get("user") as any;
  const rental = await Rental.findOne({
    _id: c.req.param("id"),
    user_id: user._id,
  }).populate("product_id");

  if (!rental) {
    throw new AppError("Reserva no encontrada", 404, "RENTAL_NOT_FOUND");
  }
  return c.json({ rental });
});

// DELETE /api/rentals/:id - Cancel a pending rental
rentals.delete("/:id", async (c) => {
  const user = c.get("user") as any;
  const rental = await Rental.findOne({
    _id: c.req.param("id"),
    user_id: user._id,
  });

  if (!rental) {
    throw new AppError("Reserva no encontrada", 404, "RENTAL_NOT_FOUND");
  }

  if (rental.status !== "pending") {
    throw new AppError(
      `Solo se pueden cancelar reservas en estado pendiente. Estado actual: ${rental.status}.`,
      400,
      "RENTAL_CANNOT_CANCEL",
    );
  }

  rental.status = "cancelled";
  await rental.save();

  return c.json({ message: "Reserva cancelada exitosamente.", rental });
});

export default rentals;
