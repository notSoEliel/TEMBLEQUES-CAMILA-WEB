import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { checkAvailability } from "../services/availability.js";
import { AppError } from "../lib/errors.js";
import { type IProduct } from "../models/Product.js";
import { type IUser } from "../models/User.js";
import {
  createStripeSession,
  handleStripeWebhook,
  isStripeConfigured,
  type IPopulatedRental,
} from "../services/stripe.js";

const stripe = new Hono<{ Variables: AuthVariables }>();

// ─── Validation ───────────────────────────────────────────────────────────────
const createSessionSchema = z.object({
  orderGroupId: z.string().optional(),
  rentalIds: z.array(z.string()).min(1, "Al menos un ID de reserva es requerido").optional(),
  rentalId: z.string().optional(), // Fallback for backward compatibility
  paymentType: z.enum(["reservation", "full"]).optional(),
});

// ─── POST /api/stripe/create-checkout-session ─────────────────────────────────
stripe.post("/create-checkout-session", authMiddleware, async (c) => {
  const user = c.get("user") as IUser;
  const body = await c.req.json();
  const { orderGroupId, rentalIds: inputIds, rentalId: inputId, paymentType } = createSessionSchema.parse(body);
  
  let rentals = [];

  if (orderGroupId) {
    rentals = await Rental.find({
      order_group_id: orderGroupId,
      user_id: user._id,
      status: "pending",
    }).populate("product_id");
  } else {
    const rentalIds = inputIds || (inputId ? [inputId] : []);
    
    if (rentalIds.length === 0) {
      throw new AppError("No se proporcionó orderGroupId ni IDs de reserva.", 400, "BAD_REQUEST");
    }

    rentals = await Rental.find({
      _id: { $in: rentalIds },
      user_id: user._id,
      status: "pending",
    }).populate("product_id");
  }

  if (rentals.length === 0) {
    throw new AppError(
      "No se encontraron reservas pendientes para procesar.",
      404,
      "RENTAL_NOT_FOUND",
    );
  }

  // Update payment type if requested
  if (paymentType) {
    for (const rental of rentals) {
      rental.payment_type = paymentType;
      await rental.save();
    }
  }

  // Re-check availability for all
  for (const rental of rentals) {
    const product = rental.product_id as unknown as IProduct;
    const isAvailable = await checkAvailability(
      product._id.toString(),
      rental.start_date,
      rental.end_date,
      rental.selected_size,
      rental._id.toString(),
    );

    if (!isAvailable) {
      rental.status = "cancelled";
      await rental.save();
      throw new AppError(
        `El producto "${product.name}" ya no está disponible para las fechas seleccionadas.`,
        409,
        "PRODUCT_DATES_UNAVAILABLE",
      );
    }
  }

  // Demo mode
  if (!isStripeConfigured()) {
    for (const rental of rentals) {
      rental.status = "paid";
      rental.payment_status = "completed";
      rental.stripe_session_id = `demo_session_${Date.now()}`;
      if (rental.deposit_required && rental.deposit_amount > 0) {
        rental.deposit_status = "held";
      }
      await rental.save();
    }

    return c.json({
      mode: "demo",
      message: "Pago simulado exitosamente (modo demo).",
      sessionId: rentals[0].stripe_session_id,
      rentals: rentals.map(r => ({ id: r._id, status: r.status })),
    });
  }

  // Real Stripe
  const origin = c.req.header("origin") || "http://localhost:5173";
  const { url, sessionId } = await createStripeSession(rentals as unknown as IPopulatedRental[], origin);

  for (const rental of rentals) {
    rental.stripe_session_id = sessionId;
    await rental.save();
  }

  return c.json({ url, sessionId });
});

// ─── GET /api/stripe/verify-session ───────────────────────────────────────────
// Called by Confirmation page to check session status immediately without waiting for webhook
stripe.get("/verify-session", authMiddleware, async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) {
    throw new AppError("session_id es requerido", 400, "BAD_REQUEST");
  }

  // If in demo mode, just return ok since session isn't real
  if (!isStripeConfigured()) {
    return c.json({ verified: true, mode: "demo" });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const orderGroupId = session.metadata?.orderGroupId;
      if (orderGroupId) {
        // Update rentals just in case webhook hasn't fired yet
        const rentalsToUpdate = await Rental.find({ order_group_id: orderGroupId });
        for (const rental of rentalsToUpdate) {
          rental.status = rental.payment_type === "full" ? "paid" : "reserved";
          rental.payment_status = "completed";
          await rental.save();
        }
      } else {
        // Fallback for older sessions
        const rentalId = session.metadata?.rentalId;
        if (rentalId) {
          const rental = await Rental.findById(rentalId);
          if (rental) {
            rental.status = rental.payment_type === "full" ? "paid" : "reserved";
            rental.payment_status = "completed";
            await rental.save();
          }
        }
      }
    }
    return c.json({ verified: true, payment_status: session.payment_status });
  } catch (error) {
    console.error("Error verifying session:", error);
    throw new AppError("Error verificando la sesión", 500, "STRIPE_VERIFY_ERROR");
  }
});

// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// CRITICAL: This endpoint must receive the RAW request body (not parsed JSON)
// so that Stripe can verify the webhook signature. Hono reads the body lazily,
// so `c.req.text()` returns the unaltered bytes — this is correct.
stripe.post("/webhook", async (c) => {
  // Demo mode: ignore webhook calls
  if (!isStripeConfigured()) {
    return c.json({ received: true, mode: "demo" });
  }

  const sig = c.req.header("stripe-signature");
  if (!sig) {
    throw new AppError(
      "Cabecera stripe-signature ausente.",
      400,
      "STRIPE_MISSING_SIGNATURE",
    );
  }

  // Read raw body — must not be pre-parsed
  const rawBody = await c.req.text();

  const result = await handleStripeWebhook(rawBody, sig);
  return c.json(result);
});

export default stripe;
