import { Rental, type IRental } from "../models/Rental.js";
import { AppError } from "../lib/errors.js";

function toCents(amount: number): number {
  return Math.max(0, Math.round(amount * 100));
}

// We import Stripe lazily so demo mode does not crash at startup.
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

export async function createStripeSession(
  rental: IRental & { _id: any },
  product: { _id?: string; name: string; description?: string },
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
            description: `${rental.start_date.toLocaleDateString("es-PA")} -> ${rental.end_date.toLocaleDateString("es-PA")}`,
          },
          unit_amount: toCents(rental.total),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    payment_intent_data: {
      setup_future_usage: "off_session",
    },
    success_url: `${origin}/confirmation?rental=${rental._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/${product._id || (product as any)._id}?cancelled=1`,
    metadata: {
      rentalId: rental._id.toString(),
      userId: rental.user_id.toString(),
      depositRequired: rental.deposit_required ? "true" : "false",
      depositAmount: String(rental.deposit_amount ?? 0),
    },
  });

  if (!session.url) {
    throw new AppError(
      "Stripe no devolvio una URL de pago. Intenta de nuevo.",
      502,
      "STRIPE_SESSION_NO_URL",
    );
  }

  return { url: session.url, sessionId: session.id };
}

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
      "Firma del webhook invalida. El cuerpo de la solicitud pudo haber sido modificado.",
      400,
      "STRIPE_WEBHOOK_INVALID_SIGNATURE",
    );
  }

  await processStripeEvent(event);
  return { received: true, event: event.type };
}

async function processStripeEvent(event: import("stripe").Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const rentalId = session.metadata?.rentalId;
      if (!rentalId) {
        break;
      }

      const rental = await Rental.findById(rentalId);
      if (!rental) {
        break;
      }

      rental.status = "paid";
      rental.payment_status = "completed";
      await hydrateRentalPaymentSources(rental, session);
      await rental.save();

      if (rental.deposit_required && rental.deposit_amount > 0) {
        try {
          await createDepositHold(rental);
          rental.deposit_status = "held";
          rental.deposit_failure_reason = undefined;
        } catch (error: any) {
          rental.deposit_status = "failed";
          rental.deposit_failure_reason =
            error?.message || "No se pudo crear el hold del deposito de garantia.";
        }
        await rental.save();
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const rentalId = session.metadata?.rentalId;
      if (rentalId) {
        await Rental.findByIdAndUpdate(rentalId, {
          status: "cancelled",
          payment_status: "failed",
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
      const rentalId = intent.metadata?.rentalId;
      if (!rentalId) {
        break;
      }

      await Rental.findByIdAndUpdate(rentalId, {
        payment_status: "failed",
      });
      break;
    }

    default:
      break;
  }
}

async function hydrateRentalPaymentSources(
  rental: IRental,
  session: import("stripe").Stripe.Checkout.Session,
): Promise<void> {
  const stripe = await getStripeClient();

  if (session.id) {
    rental.stripe_session_id = session.id;
  }
  if (typeof session.payment_intent === "string") {
    rental.stripe_payment_intent_id = session.payment_intent;
  }
  if (typeof session.customer === "string") {
    rental.stripe_customer_id = session.customer;
  }

  if (!rental.stripe_payment_intent_id) {
    return;
  }

  const intent = await stripe.paymentIntents.retrieve(rental.stripe_payment_intent_id);

  if (!rental.stripe_customer_id && typeof intent.customer === "string") {
    rental.stripe_customer_id = intent.customer;
  }

  if (typeof intent.payment_method === "string") {
    rental.stripe_payment_method_id = intent.payment_method;
  } else if (intent.payment_method && typeof intent.payment_method === "object") {
    rental.stripe_payment_method_id = intent.payment_method.id;
  }
}

function assertReusablePaymentSource(rental: IRental, operationCode: string): void {
  if (!rental.stripe_customer_id || !rental.stripe_payment_method_id) {
    throw new AppError(
      "No se encontro un metodo de pago reutilizable para ejecutar este cobro automatico.",
      409,
      operationCode,
    );
  }
}

async function createDepositHold(rental: IRental): Promise<void> {
  if (!rental.deposit_required || rental.deposit_amount <= 0) {
    return;
  }
  assertReusablePaymentSource(rental, "DEPOSIT_PAYMENT_METHOD_MISSING");

  const stripe = await getStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: toCents(rental.deposit_amount),
    currency: "usd",
    customer: rental.stripe_customer_id!,
    payment_method: rental.stripe_payment_method_id!,
    confirm: true,
    off_session: true,
    capture_method: "manual",
    description: `Deposito de garantia de la reserva ${rental._id}`,
    metadata: {
      rentalId: rental._id.toString(),
      purpose: "deposit_hold",
    },
  });

  rental.stripe_deposit_intent_id = intent.id;
}

export async function releaseDepositHold(rental: IRental): Promise<void> {
  if (!rental.stripe_deposit_intent_id) {
    throw new AppError(
      "No se encontro el intento de pago del deposito para liberar.",
      404,
      "DEPOSIT_INTENT_NOT_FOUND",
    );
  }

  const stripe = await getStripeClient();
  await stripe.paymentIntents.cancel(rental.stripe_deposit_intent_id);
}

export async function captureDepositForDamage(rental: IRental): Promise<void> {
  const stripe = await getStripeClient();

  if (rental.stripe_deposit_intent_id && rental.deposit_status === "held") {
    await stripe.paymentIntents.capture(rental.stripe_deposit_intent_id, {
      amount_to_capture: toCents(rental.deposit_amount),
    });
    return;
  }

  assertReusablePaymentSource(rental, "DAMAGE_PAYMENT_METHOD_MISSING");

  const intent = await stripe.paymentIntents.create({
    amount: toCents(rental.deposit_amount),
    currency: "usd",
    customer: rental.stripe_customer_id!,
    payment_method: rental.stripe_payment_method_id!,
    confirm: true,
    off_session: true,
    description: `Cargo por danos de la reserva ${rental._id}`,
    metadata: {
      rentalId: rental._id.toString(),
      purpose: "damage_charge",
    },
  });

  rental.stripe_deposit_intent_id = intent.id;
}

export async function chargeLateFee(rental: IRental): Promise<void> {
  if (rental.late_fee_amount <= 0) {
    return;
  }

  assertReusablePaymentSource(rental, "LATE_FEE_PAYMENT_METHOD_MISSING");

  const stripe = await getStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: toCents(rental.late_fee_amount),
    currency: "usd",
    customer: rental.stripe_customer_id!,
    payment_method: rental.stripe_payment_method_id!,
    confirm: true,
    off_session: true,
    description: `Penalidad por atraso de la reserva ${rental._id}`,
    metadata: {
      rentalId: rental._id.toString(),
      purpose: "late_fee",
      lateDays: String(rental.late_days || 0),
    },
  });

  rental.stripe_late_fee_intent_id = intent.id;
}
