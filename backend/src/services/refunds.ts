import { AppError } from "../lib/errors.js";
import { PaymentRefund, type IPaymentRefund } from "../models/PaymentRefund.js";
import { Rental } from "../models/Rental.js";
import { getStripeClient } from "./stripe.js";
import { rentalPaidAmount } from "./cancellation-policy.js";
import { User } from "../models/User.js";
import { dispatchNotification } from "./notifications.js";
import { structuredLog } from "./observability.js";

export interface RefundResult {
  refund: IPaymentRefund;
  refundedTotal: number;
  refundableRemaining: number;
}

export async function createRentalRefund(params: {
  rentalId: string;
  requestedBy: string;
  amount?: number;
  reason: string;
  idempotencyKey: string;
  requestId?: string;
}): Promise<RefundResult> {
  const reason = params.reason.trim();
  if (reason.length < 5) {
    throw new AppError("El motivo del reembolso es obligatorio.", 400, "REFUND_REASON_REQUIRED");
  }

  const existing = await PaymentRefund.findOne({ idempotency_key: params.idempotencyKey });
  if (existing?.status === "succeeded" || existing?.status === "pending") {
    const previous = await PaymentRefund.find({ rental_id: existing.rental_id, status: "succeeded" });
    const refundedTotal = previous.reduce((sum, refund) => sum + refund.amount, 0);
    const rental = await Rental.findById(existing.rental_id).select("total discount_amount payment_type deposit_amount stripe_payment_amount");
    const paidAmount = rental ? rentalPaidAmount(rental) : refundedTotal;
    return { refund: existing, refundedTotal, refundableRemaining: Math.max(0, paidAmount - refundedTotal) };
  }

  const rental = await Rental.findById(params.rentalId);
  if (!rental) throw new AppError("Reserva no encontrada.", 404, "RENTAL_NOT_FOUND");
  if (!rental.stripe_payment_intent_id) {
    throw new AppError("La reserva no tiene un pago de Stripe confirmado.", 409, "REFUND_PAYMENT_NOT_FOUND");
  }
  if (rental.payment_status !== "completed" && rental.payment_status !== "refunded") {
    throw new AppError("Solo se pueden reembolsar pagos confirmados.", 409, "REFUND_PAYMENT_NOT_CONFIRMED");
  }

  const paidAmount = rentalPaidAmount(rental);
  const previousRefunds = await PaymentRefund.find({ rental_id: rental._id, status: "succeeded" });
  const refundedTotal = previousRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  const refundableRemaining = Math.max(0, paidAmount - refundedTotal);
  const amount = Math.round((params.amount ?? refundableRemaining) * 100) / 100;
  if (amount <= 0 || amount > refundableRemaining) {
    throw new AppError("El monto supera el saldo reembolsable del pago.", 409, "REFUND_AMOUNT_INVALID");
  }

  const refund = await PaymentRefund.create({
    rental_id: rental._id,
    requested_by: params.requestedBy,
    stripe_payment_intent_id: rental.stripe_payment_intent_id,
    amount,
    reason,
    status: "pending",
    idempotency_key: params.idempotencyKey,
    request_id: params.requestId,
  });

  try {
    const stripe = await getStripeClient();
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: rental.stripe_payment_intent_id,
        amount: Math.round(amount * 100),
        reason: "requested_by_customer",
        metadata: { rentalId: rental._id.toString(), reason },
      },
      { idempotencyKey: params.idempotencyKey },
    );

    refund.status = stripeRefund.status === "succeeded" ? "succeeded" : "pending";
    refund.stripe_refund_id = stripeRefund.id;
    await refund.save();
    if (refund.status === "succeeded" && refundedTotal + amount >= paidAmount) {
      rental.payment_status = "refunded";
      await rental.save();
    }

    if (refund.status === "succeeded") {
      void User.findById(rental.user_id).select("email").lean()
        .then((user) => dispatchNotification({
          userId: rental.user_id.toString(),
          email: user?.email,
          type: "refund_completed",
          title: "Reembolso procesado",
          message: `Se procesó un reembolso de $${amount.toFixed(2)} PAB para tu reserva.`,
          idempotencyKey: `refund:completed:${refund._id.toString()}`,
          metadata: { rentalId: rental._id.toString(), refundId: refund._id.toString() },
        }))
        .catch((error: unknown) => {
          structuredLog("error", "notification.dispatch_failed", {
            source: "refund",
            rentalId: rental._id.toString(),
            type: "refund_completed",
            errorCode: error instanceof Error ? error.name : "NOTIFICATION_DISPATCH_FAILED",
          });
        });
    }

    return {
      refund,
      refundedTotal: refundedTotal + (refund.status === "succeeded" ? amount : 0),
      refundableRemaining: Math.max(0, paidAmount - refundedTotal - amount),
    };
  } catch (error: unknown) {
    refund.status = "failed";
    refund.error_code = error instanceof Error ? error.name : "STRIPE_REFUND_FAILED";
    await refund.save();
    throw new AppError("Stripe no pudo crear el reembolso.", 502, "STRIPE_REFUND_FAILED");
  }
}
