import { Rental, type IRental } from "../models/Rental.js";
import { AppError } from "../lib/errors.js";

// ─── Lazy Stripe client ───────────────────────────────────────────────────────
// We import Stripe lazily so that in demo mode (placeholder key) the import
// never resolves and we avoid a top-level crash.
async function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_placeholder") {
    throw new AppError(
      "Stripe no está configurado. Usa una clave real en STRIPE_SECRET_KEY.",
      503,
      "STRIPE_NOT_CONFIGURED",
    );
  }
  const Stripe = (await import("stripe")).default;
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key !== "sk_test_placeholder");
}

// ─── Create Checkout Session ──────────────────────────────────────────────────
export async function createStripeSession(
  rental: IRental & { _id: any },
  product: { name: string; description?: string },
  origin: string,
): Promise<{ url: string; sessionId: string }> {
  const stripe = await getStripeClient();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Alquiler: ${product.name}`,
            description: `${rental.start_date.toLocaleDateString("es-PA")} → ${rental.end_date.toLocaleDateString("es-PA")}`,
          },
          // Stripe expects cents (integer)
          unit_amount: Math.round(rental.total * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/confirmation?rental=${rental._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/${(product as any)._id}?cancelled=1`,
    metadata: {
      rentalId: rental._id.toString(),
      userId: rental.user_id.toString(),
    },
  });

  if (!session.url) {
    throw new AppError(
      "Stripe no devolvió una URL de pago. Intenta de nuevo.",
      502,
      "STRIPE_SESSION_NO_URL",
    );
  }

  return { url: session.url, sessionId: session.id };
}

// ─── Webhook Event Handler ────────────────────────────────────────────────────
/**
 * Verifies and processes a raw Stripe webhook event.
 *
 * IMPORTANT: `rawBody` must be the unmodified request body bytes. Do NOT
 * parse it as JSON before calling this function — Stripe's signature
 * verification will fail if the body has been altered.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
): Promise<{ received: boolean; event?: string }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === "whsec_placeholder") {
    throw new AppError(
      "STRIPE_WEBHOOK_SECRET no configurado.",
      503,
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
    );
  }

  const stripe = await getStripeClient();

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new AppError(
      "Firma del webhook inválida. El cuerpo de la solicitud pudo haber sido modificado.",
      400,
      "STRIPE_WEBHOOK_INVALID_SIGNATURE",
    );
  }

  await processStripeEvent(event);
  return { received: true, event: event.type };
}

async function processStripeEvent(
  event: import("stripe").Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const rentalId = session.metadata?.rentalId;
      if (rentalId) {
        await Rental.findByIdAndUpdate(rentalId, {
          status: "paid",
          payment_status: "completed",
        });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const rentalId = session.metadata?.rentalId;
      if (rentalId) {
        // Session expired (user closed tab / 24h window passed).
        // Cancel the rental so the product becomes available again.
        await Rental.findByIdAndUpdate(rentalId, {
          status: "cancelled",
          payment_status: "failed",
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
      // Find the rental whose stripe_session_id's payment intent matches
      const rental = await Rental.findOne({
        stripe_session_id: { $exists: true },
        status: "pending",
        // Match by PI id stored in metadata if available
      });
      if (rental && intent.metadata?.rentalId) {
        await Rental.findByIdAndUpdate(intent.metadata.rentalId, {
          payment_status: "failed",
        });
      }
      break;
    }

    default:
      // Unhandled event type — not an error, just ignore
      break;
  }
}
