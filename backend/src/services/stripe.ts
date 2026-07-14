import { Rental, type IRental } from "../models/Rental.js";
import { StripeWebhookEvent } from "../models/StripeWebhookEvent.js";
import { AppError } from "../lib/errors.js";
import { type IProduct } from "../models/Product.js";
import { raiseSystemAlert } from "./alerts.js";
import { recordMetric, structuredLog } from "./observability.js";

export type IPopulatedRental = Omit<IRental, "product_id"> & {
  product_id: IProduct;
};

function toCents(amount: number): number {
  return Math.max(0, Math.round(amount * 100));
}

// We import Stripe lazily so demo mode does not crash at startup.
export async function getStripeClient() {
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

export function isStripeDemoAllowed(): boolean {
  const appEnv = process.env.APP_ENV;
  return appEnv === undefined || appEnv === "local" || appEnv === "ci";
}

export async function createStripeSession(
  rentals: IPopulatedRental[],
  origin: string,
): Promise<{ url: string; sessionId: string }> {
  const stripe = await getStripeClient();

  const line_items = rentals.map((rental) => ({
    price_data: {
      currency: "pab",
      product_data: {
        name: `${rental.payment_type === "full" ? "Pago Completo" : "Reserva (25%)"}: ${rental.product_id.name}`,
        description: `Talla: ${rental.selected_size} | ${rental.start_date.toLocaleDateString("es-PA")} -> ${rental.end_date.toLocaleDateString("es-PA")}`,
      },
      unit_amount: toCents(
        rental.payment_type === "full"
          ? Math.max(0, rental.total - (rental.discount_amount ?? 0))
          : rental.deposit_amount
      ), // Charge based on payment_type and discounts
    },
    quantity: 1,
  }));

  const expiresAt = Math.floor(Date.now() / 1000) + (30 * 60); // 30 minutes from now

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    expires_at: expiresAt,
    success_url: `${origin}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart?cancelled=1`,
    metadata: {
      orderGroupId: rentals[0].order_group_id,
      userId: rentals[0].user_id.toString(),
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

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  requestId?: string,
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
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    throw new AppError(
      "Firma del webhook invalida. El cuerpo de la solicitud pudo haber sido modificado.",
      400,
      "STRIPE_WEBHOOK_INVALID_SIGNATURE",
    );
  }

  const claimed = await claimWebhookEvent(event.id, event.type, requestId);
  if (!claimed) return { received: true, event: event.type };

  try {
    await processStripeEvent(event, requestId);
    await StripeWebhookEvent.updateOne(
      { event_id: event.id },
      { $set: { status: "processed", processed_at: new Date(), last_error: undefined } },
    );
  } catch (error: unknown) {
    await StripeWebhookEvent.updateOne(
      { event_id: event.id },
      { $set: { status: "failed", last_error: errorMessage(error) } },
    );
    throw error;
  }

  return { received: true, event: event.type };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === 11000;
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : "Error desconocido").slice(0, 500);
}

async function claimWebhookEvent(
  eventId: string,
  eventType: string,
  requestId?: string,
): Promise<boolean> {
  try {
    await StripeWebhookEvent.create({
      event_id: eventId,
      event_type: eventType,
      status: "processing",
      attempts: 1,
      request_id: requestId,
    });
    return true;
  } catch (error: unknown) {
    if (!isDuplicateKeyError(error)) throw error;
  }

  const existing = await StripeWebhookEvent.findOne({ event_id: eventId });
  if (!existing || existing.status === "processed" || existing.status === "processing") {
    return false;
  }

  const retried = await StripeWebhookEvent.findOneAndUpdate(
    { event_id: eventId, status: "failed" },
    {
      $set: { status: "processing", event_type: eventType, request_id: requestId, last_error: undefined },
      $inc: { attempts: 1 },
    },
    { new: true },
  );
  return Boolean(retried);
}

async function processStripeEvent(
  event: import("stripe").Stripe.Event,
  requestId?: string,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      validateCheckoutSession(session);
      const orderGroupId = session.metadata?.orderGroupId;
      
      let rentalsToUpdate: IRental[] = [];
      if (orderGroupId) {
        rentalsToUpdate = await Rental.find({ order_group_id: orderGroupId });
      } else {
        // Fallback for older sessions
        const rentalIds = session.metadata?.rentalIds?.split(",") || [];
        const singleId = session.metadata?.rentalId;
        if (singleId && rentalIds.length === 0) rentalIds.push(singleId);
        if (rentalIds.length > 0) {
          rentalsToUpdate = await Rental.find({ _id: { $in: rentalIds } });
        }
      }

      if (rentalsToUpdate.length === 0) {
        throw new AppError("No se encontraron reservas para la sesión de Stripe.", 404, "STRIPE_RENTALS_NOT_FOUND");
      }
      validateCheckoutOwnershipAndAmount(session, rentalsToUpdate);

      for (const rental of rentalsToUpdate) {
        rental.status = rental.payment_type === "full" ? "paid" : "reserved";
        rental.payment_status = "completed";
        const discountedTotal = Math.max(0, rental.total - (rental.discount_amount ?? 0));
        const expectedRentalAmount = rental.payment_type === "full" ? discountedTotal : rental.deposit_amount;
        rental.stripe_payment_amount = toCents(expectedRentalAmount) / 100;
        await hydrateRentalPaymentSources(rental, session);
        await rental.save();

        if (rental.deposit_required && rental.deposit_amount > 0) {
          rental.deposit_status = "pending_hold";
          rental.deposit_failure_reason =
            "El depósito no se cobra automáticamente: el checkout no guarda métodos de pago.";
          await rental.save();
        }
      }
      recordMetric("checkout_completed_total", rentalsToUpdate.length, { mode: "stripe", requestId: requestId ?? "unknown" });
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const orderGroupId = session.metadata?.orderGroupId;
      
      let rentalsToCancel: IRental[] = [];
      if (orderGroupId) {
        rentalsToCancel = await Rental.find({ order_group_id: orderGroupId, status: "pending" });
      } else {
        // Fallback for older sessions
        const rentalIds = session.metadata?.rentalIds?.split(",") || [];
        const singleId = session.metadata?.rentalId;
        if (singleId && rentalIds.length === 0) rentalIds.push(singleId);
        if (rentalIds.length > 0) {
          rentalsToCancel = await Rental.find({ _id: { $in: rentalIds }, status: "pending" });
        }
      }

      for (const rental of rentalsToCancel) {
        rental.status = "cancelled";
        rental.payment_status = "failed";
        await rental.save();
      }
      recordMetric("checkout_expired_total", rentalsToCancel.length);
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
      recordMetric("payment_failed_total");
      void raiseSystemAlert({
        type: "payment_failed",
        severity: "warning",
        message: "Stripe informó un pago fallido.",
        source: "stripe.webhook",
        metadata: { rentalId },
      }).catch((error: unknown) => {
        structuredLog("error", "alert.persist_failed", { error: error instanceof Error ? error.message : "unknown" });
      });
      break;
    }

    default:
      break;
  }
}

function validateCheckoutSession(session: import("stripe").Stripe.Checkout.Session): void {
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new AppError("La sesión de Stripe no confirma un pago completado.", 409, "STRIPE_PAYMENT_NOT_CONFIRMED");
  }
  if (!session.metadata?.userId) {
    throw new AppError("La sesión de Stripe no identifica al usuario.", 400, "STRIPE_SESSION_METADATA_INVALID");
  }
  if (typeof session.amount_total !== "number" || session.amount_total <= 0) {
    throw new AppError("La sesión de Stripe no contiene un monto válido.", 400, "STRIPE_SESSION_AMOUNT_INVALID");
  }
  if (session.currency && session.currency.toLowerCase() !== "pab") {
    throw new AppError("La moneda de la sesión de Stripe no es PAB.", 400, "STRIPE_SESSION_CURRENCY_INVALID");
  }
}

function validateCheckoutOwnershipAndAmount(
  session: import("stripe").Stripe.Checkout.Session,
  rentals: IRental[],
): void {
  const expectedUserId = session.metadata?.userId;
  const hasForeignRental = rentals.some((rental) => rental.user_id.toString() !== expectedUserId);
  if (hasForeignRental) {
    throw new AppError("La sesión de Stripe no pertenece a las reservas indicadas.", 403, "STRIPE_SESSION_OWNER_MISMATCH");
  }

  const expectedAmount = rentals.reduce((sum, rental) => {
    const discountedTotal = Math.max(0, rental.total - (rental.discount_amount ?? 0));
    const amount = rental.payment_type === "full" ? discountedTotal : rental.deposit_amount;
    return sum + toCents(amount);
  }, 0);
  if (session.amount_total !== expectedAmount) {
    throw new AppError("El monto de Stripe no coincide con las reservas internas.", 409, "STRIPE_SESSION_AMOUNT_MISMATCH");
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
    currency: "pab",
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
    currency: "pab",
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
    currency: "pab",
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
