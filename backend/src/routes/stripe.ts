import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { checkAvailability } from "../services/availability.js";
import { AppError } from "../lib/errors.js";
import {
  createStripeSession,
  handleStripeWebhook,
  isStripeConfigured,
} from "../services/stripe.js";

const stripe = new Hono<{ Variables: AuthVariables }>();

// ─── Validation ───────────────────────────────────────────────────────────────
const createSessionSchema = z.object({
  rentalId: z.string().min(1, "El ID de la reserva es requerido"),
});

// ─── POST /api/stripe/create-checkout-session ─────────────────────────────────
stripe.post("/create-checkout-session", authMiddleware, async (c) => {
  const user = c.get("user") as any;

  // Validate body with Zod — errors bubble to global handler
  const body = await c.req.json();
  const { rentalId } = createSessionSchema.parse(body);

  const rental = await Rental.findOne({
    _id: rentalId,
    user_id: user._id,
    status: "pending",
  }).populate("product_id");

  if (!rental) {
    throw new AppError(
      "Reserva no encontrada o ya fue procesada.",
      404,
      "RENTAL_NOT_FOUND",
    );
  }

  if (!rental.terms_accepted) {
    throw new AppError(
      "Debe aceptar los términos y condiciones antes de pagar.",
      400,
      "RENTAL_TERMS_NOT_ACCEPTED",
    );
  }

  // Re-check availability to prevent race conditions (double booking).
  // This is the authoritative server-side check even if the frontend validated.
  const isAvailable = await checkAvailability(
    rental.product_id._id.toString(),
    rental.start_date,
    rental.end_date,
    rental._id.toString(),
  );

  if (!isAvailable) {
    // Mark as cancelled so the product slot is freed
    rental.status = "cancelled";
    await rental.save();
    throw new AppError(
      "El producto ya no está disponible para las fechas seleccionadas. La reserva fue cancelada.",
      409,
      "PRODUCT_DATES_UNAVAILABLE",
    );
  }

  // ── Demo mode (Stripe not configured) ─────────────────────────────────────
  if (!isStripeConfigured()) {
    rental.status = "paid";
    rental.payment_status = "completed";
    rental.stripe_session_id = `demo_session_${Date.now()}`;
    if (rental.deposit_required && rental.deposit_amount > 0) {
      rental.deposit_status = "held";
      rental.deposit_failure_reason = undefined;
    }
    await rental.save();

    return c.json({
      mode: "demo",
      message: "Pago simulado exitosamente (modo demo — Stripe no configurado).",
      rental: {
        id: rental._id,
        status: rental.status,
        total: rental.total,
        depositRequired: rental.deposit_required,
        depositAmount: rental.deposit_amount,
        depositStatus: rental.deposit_status,
      },
    });
  }

  // ── Real Stripe integration ────────────────────────────────────────────────
  const product = rental.product_id as any;
  const origin = c.req.header("origin") || "http://localhost:5173";

  const { url, sessionId } = await createStripeSession(rental, product, origin);

  rental.stripe_session_id = sessionId;
  await rental.save();

  return c.json({
    url,
    sessionId,
    deposit: {
      required: rental.deposit_required,
      amount: rental.deposit_amount,
      status: rental.deposit_status,
    },
  });
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
      const rentalId = session.metadata?.rentalId;
      if (rentalId) {
        // Update rental just in case webhook hasn't fired yet
        await Rental.findByIdAndUpdate(rentalId, {
          status: "paid",
          payment_status: "completed",
        });
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
