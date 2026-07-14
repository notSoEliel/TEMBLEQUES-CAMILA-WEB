import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { Coupon } from "../models/Coupon.js";
import { checkAvailability } from "../services/availability.js";
import { AppError } from "../lib/errors.js";
import { type IProduct } from "../models/Product.js";
import { type IUser } from "../models/User.js";
import {
  createStripeSession,
  handleStripeWebhook,
  isStripeConfigured,
  isStripeDemoAllowed,
  type IPopulatedRental,
} from "../services/stripe.js";
import { recordMetric, structuredLog } from "../services/observability.js";

const stripe = new Hono<{ Variables: AuthVariables }>();

// ─── Validation ───────────────────────────────────────────────────────────────
const createSessionSchema = z.object({
  orderGroupId: z.string().optional(),
  rentalIds: z.array(z.string()).min(1, "Al menos un ID de reserva es requerido").optional(),
  rentalId: z.string().optional(), // Fallback for backward compatibility
  paymentType: z.enum(["reservation", "full"]).optional(),
  couponCode: z.string().optional(),
});

// ─── POST /api/stripe/create-checkout-session ─────────────────────────────────
stripe.post("/create-checkout-session", authMiddleware, async (c) => {
  const user = c.get("user") as IUser;
  const body = await c.req.json();
  const { orderGroupId, rentalIds: inputIds, rentalId: inputId, paymentType, couponCode } = createSessionSchema.parse(body);
  let claimedCouponId: string | undefined;
  
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

  recordMetric("checkout_started_total");

  // Update payment type if requested
  if (paymentType) {
    for (const rental of rentals) {
      rental.payment_type = paymentType;
      await rental.save();
    }

    recordMetric("checkout_completed_total", rentals.length, { mode: "demo" });
  }

  // Apply Coupon if provided
  const discountPerRental: Record<string, number> = {};
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), is_active: true });
    if (!coupon) {
      throw new AppError("El cupón no es válido o ha expirado.", 400, "COUPON_INVALID");
    }

    if (coupon.expires_at && new Date() > coupon.expires_at) {
      throw new AppError("El cupón ha expirado.", 400, "COUPON_EXPIRED");
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      throw new AppError("El cupón ha alcanzado el límite máximo de usos.", 400, "COUPON_LIMIT_REACHED");
    }

    const subtotal = rentals.reduce((sum, rental) => sum + rental.total, 0);
    if (coupon.min_purchase_amount && subtotal < coupon.min_purchase_amount) {
      throw new AppError(`Este cupón requiere una compra mínima de ${coupon.min_purchase_amount.toFixed(2)} PAB.`, 400, "COUPON_MIN_AMOUNT");
    }
    if (coupon.applicable_categories && coupon.applicable_categories.length > 0) {
      const categories = rentals.flatMap((rental) => {
        const product = rental.product_id as unknown as IProduct;
        return Array.isArray(product.category) ? product.category : [product.category];
      });
      if (!categories.some((category) => coupon.applicable_categories?.includes(category))) {
        throw new AppError("El cupón no aplica a las piezas seleccionadas.", 400, "COUPON_CATEGORY_RESTRICTION");
      }
    }
    claimedCouponId = coupon._id.toString();

    if (coupon.discount_type === "percentage") {
      for (const rental of rentals) {
        discountPerRental[rental._id.toString()] = Math.round(rental.total * (coupon.value / 100) * 100) / 100;
      }
    } else if (coupon.discount_type === "fixed") {
      const overallTotal = rentals.reduce((sum, r) => sum + r.total, 0);
      let remainingDiscount = coupon.value;
      for (let i = 0; i < rentals.length; i++) {
        const rental = rentals[i];
        if (i === rentals.length - 1) {
          discountPerRental[rental._id.toString()] = Math.min(rental.total, Math.round(remainingDiscount * 100) / 100);
        } else {
          const share = rental.total / overallTotal;
          const discountShare = Math.min(rental.total, Math.round(coupon.value * share * 100) / 100);
          discountPerRental[rental._id.toString()] = discountShare;
          remainingDiscount -= discountShare;
        }
      }
    }

  }

  // Update discount fields on rentals
  for (const rental of rentals) {
    const discount = discountPerRental[rental._id.toString()] || 0;
    rental.coupon_code = couponCode ? couponCode.toUpperCase() : undefined;
    rental.discount_amount = discount;

    const discountedTotal = Math.max(0, rental.total - discount);
    const depositAmount = rental.deposit_required ? Math.round(discountedTotal * 0.25 * 100) / 100 : 0;

    rental.deposit_amount = depositAmount;
    rental.balance_due = rental.payment_type === "full" ? 0 : discountedTotal - depositAmount;
    await rental.save();
  }

  if (claimedCouponId) {
    const claimedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: claimedCouponId,
        is_active: true,
        $or: [
          { max_uses: { $exists: false } },
          { max_uses: null },
          { $expr: { $lt: ["$used_count", "$max_uses"] } },
        ],
      },
      { $inc: { used_count: 1 } },
      { new: true },
    );
    if (!claimedCoupon) {
      throw new AppError("El cupón alcanzó su límite mientras se procesaba el checkout.", 409, "COUPON_LIMIT_REACHED");
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

  // El modo demo solo es válido para desarrollo local y CI. Staging y producción
  // deben fallar de forma explícita si Stripe no está configurado.
  if (!isStripeConfigured()) {
    if (!isStripeDemoAllowed()) {
      throw new AppError(
        "Stripe debe estar configurado en staging y producción.",
        503,
        "STRIPE_NOT_CONFIGURED",
      );
    }

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
  recordMetric("checkout_sessions_created_total", 1, { mode: "stripe" });

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

  const user = c.get("user") as IUser;
  const ownedRental = await Rental.exists({ stripe_session_id: sessionId, user_id: user._id });
  if (!ownedRental) {
    throw new AppError("La sesión de pago no pertenece al usuario autenticado.", 404, "STRIPE_SESSION_NOT_FOUND");
  }

  // If in demo mode, just return ok since session isn't real
  if (!isStripeConfigured()) {
    return c.json({ verified: true, mode: "demo" });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    // El webhook verificado es la única fuente de verdad para cambiar el estado.
    // Esta ruta solo consulta Stripe para mostrar el resultado al cliente.
    return c.json({ verified: true, payment_status: session.payment_status });
  } catch (error) {
    structuredLog("error", "stripe.session_verification_failed", { error: error instanceof Error ? error.message : "unknown" });
    throw new AppError("Error verificando la sesión", 500, "STRIPE_VERIFY_ERROR");
  }
});

// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// CRITICAL: This endpoint must receive the RAW request body (not parsed JSON)
// so that Stripe can verify the webhook signature. Hono reads the body lazily,
// so `c.req.text()` returns the unaltered bytes — this is correct.
stripe.post("/webhook", async (c) => {
  // Nunca aceptar webhooks simulados fuera de local/CI.
  if (!isStripeConfigured()) {
    if (!isStripeDemoAllowed()) {
      throw new AppError(
        "Stripe debe estar configurado para recibir webhooks.",
        503,
        "STRIPE_WEBHOOK_NOT_CONFIGURED",
      );
    }
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

  const result = await handleStripeWebhook(rawBody, sig, c.req.header("x-request-id"));
  return c.json(result);
});

export default stripe;
