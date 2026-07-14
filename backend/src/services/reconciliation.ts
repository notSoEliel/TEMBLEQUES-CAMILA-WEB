import { PaymentReconciliationRun, type ReconciliationDifference } from "../models/PaymentReconciliationRun.js";
import { Rental } from "../models/Rental.js";
import { StripeWebhookEvent } from "../models/StripeWebhookEvent.js";
import { getStripeClient } from "./stripe.js";
import { rentalPaidAmount } from "./cancellation-policy.js";

export async function reconcilePayments(params: { requestId?: string }): Promise<{
  runId: string;
  inspected: number;
  consistent: number;
  inconsistent: number;
  differences: ReconciliationDifference[];
}> {
  const startedAt = new Date();
  const stripe = await getStripeClient();
  const rentals = await Rental.find({
    $or: [
      { payment_status: { $in: ["completed", "refunded"] } },
      { stripe_session_id: { $exists: true } },
      { stripe_payment_intent_id: { $exists: true } },
    ],
  }).limit(500);
  const differences: ReconciliationDifference[] = [];
  let consistent = 0;

  for (const rental of rentals) {
    const rentalId = rental._id.toString();
    const expectedAmount = rentalPaidAmount(rental);
    if (!rental.stripe_session_id || !rental.stripe_payment_intent_id) {
      differences.push({ rentalId, code: "MISSING_STRIPE_REFERENCE", message: "La reserva no tiene Checkout Session y PaymentIntent completos." });
      continue;
    }

    try {
      const [session, intent, webhook] = await Promise.all([
        stripe.checkout.sessions.retrieve(rental.stripe_session_id),
        stripe.paymentIntents.retrieve(rental.stripe_payment_intent_id),
        StripeWebhookEvent.findOne({
          event_type: "checkout.session.completed",
          status: "processed",
          stripe_object_id: rental.stripe_session_id,
        }).lean(),
      ]);
      const stripeAmount = (session.amount_total ?? intent.amount) / 100;
      if (Math.abs(stripeAmount - expectedAmount) > 0.01) {
        differences.push({ rentalId, code: "AMOUNT_MISMATCH", message: "El monto interno no coincide con Stripe.", expectedAmount, stripeAmount });
        continue;
      }
      if (intent.status !== "succeeded") {
        differences.push({ rentalId, code: "PAYMENT_INTENT_NOT_SUCCEEDED", message: "El PaymentIntent no está confirmado.", expectedAmount, stripeAmount, stripeStatus: intent.status });
        continue;
      }
      if (!webhook && rental.payment_status === "completed") {
        differences.push({ rentalId, code: "WEBHOOK_EVIDENCE_MISSING", message: "No hay evidencia procesada de checkout.session.completed." });
        continue;
      }
      if (rental.status === "cancelled" && rental.payment_status !== "refunded") {
        differences.push({ rentalId, code: "CANCELLED_WITHOUT_REFUND", message: "La reserva cancelada conserva un pago sin reembolso." });
        continue;
      }
      consistent += 1;
    } catch {
      differences.push({ rentalId, code: "STRIPE_LOOKUP_FAILED", message: "No se pudo consultar la sesión o el PaymentIntent en Stripe." });
    }
  }

  const run = await PaymentReconciliationRun.create({
    startedAt,
    finishedAt: new Date(),
    inspected: rentals.length,
    consistent,
    inconsistent: differences.length,
    differences: differences.slice(0, 500),
    requestId: params.requestId,
  });
  return { runId: run._id.toString(), inspected: rentals.length, consistent, inconsistent: differences.length, differences };
}
