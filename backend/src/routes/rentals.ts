import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { createRental } from "../services/rental.js";
import { AppError } from "../lib/errors.js";

const rentals = new Hono();

// All rental routes require authentication
rentals.use("/*", authMiddleware);

const createRentalSchema = z.object({
  productId: z.string().min(1, "El ID del producto es requerido"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  termsAccepted: z.boolean(),
});

// POST /api/rentals - Create reservation
rentals.post("/", async (c) => {
  const body = await c.req.json();
  const data = createRentalSchema.parse(body); // ZodError → global handler
  const user = c.get("user") as any;

  const rental = await createRental({
    userId: user._id.toString(),
    productId: data.productId,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    termsAccepted: data.termsAccepted,
    ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
  });

  return c.json({ rental }, 201);
});

// GET /api/rentals/my - My reservations
rentals.get("/my", async (c) => {
  const user = c.get("user") as any;
  const myRentals = await Rental.find({ user_id: user._id })
    .populate("product_id", "name category images rental_price")
    .sort({ createdAt: -1 });
  return c.json({ rentals: myRentals });
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

export default rentals;

