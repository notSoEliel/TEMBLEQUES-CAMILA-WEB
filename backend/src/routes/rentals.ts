import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { createRental } from "../services/rental.js";

const rentals = new Hono();

// All rental routes require authentication
rentals.use("/*", authMiddleware);

const createRentalSchema = z.object({
  productId: z.string().min(1, "ID de producto requerido"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
  termsAccepted: z.boolean(),
});

// POST /api/rentals - Create reservation
rentals.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const data = createRentalSchema.parse(body);
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
  } catch (error: any) {
    if (error.issues) {
      return c.json({ error: error.issues[0].message }, 400);
    }
    return c.json({ error: error.message || "Error al crear reserva" }, 400);
  }
});

// GET /api/rentals/my - My reservations
rentals.get("/my", async (c) => {
  try {
    const user = c.get("user") as any;
    const myRentals = await Rental.find({ user_id: user._id })
      .populate("product_id", "name category images rental_price")
      .sort({ createdAt: -1 });
    return c.json({ rentals: myRentals });
  } catch (error: any) {
    return c.json({ error: error.message || "Error al obtener reservas" }, 500);
  }
});

// GET /api/rentals/:id - Single rental
rentals.get("/:id", async (c) => {
  try {
    const user = c.get("user") as any;
    const rental = await Rental.findOne({
      _id: c.req.param("id"),
      user_id: user._id,
    }).populate("product_id");

    if (!rental) {
      return c.json({ error: "Reserva no encontrada" }, 404);
    }
    return c.json({ rental });
  } catch (error: any) {
    return c.json({ error: error.message || "Error al obtener reserva" }, 500);
  }
});

export default rentals;
