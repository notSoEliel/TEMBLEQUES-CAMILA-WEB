import type { IRental } from "../models/Rental.js";
import { getPanamaTodayUTC } from "./payment-rules.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CancellationDecision {
  daysUntilStart: number;
  refundPercentage: number;
  refundableAmount: number;
  policyLabel: string;
}

export function rentalPaidAmount(rental: Pick<IRental, "total" | "discount_amount" | "payment_type" | "deposit_amount" | "stripe_payment_amount">): number {
  if (typeof rental.stripe_payment_amount === "number") return rental.stripe_payment_amount;
  const discountedTotal = Math.max(0, rental.total - (rental.discount_amount ?? 0));
  return rental.payment_type === "full" ? discountedTotal : rental.deposit_amount;
}

export function calculateCancellationDecision(rental: Pick<IRental, "start_date" | "total" | "discount_amount" | "payment_type" | "deposit_amount" | "stripe_payment_amount">, now = new Date()): CancellationDecision {
  const today = getPanamaTodayUTC(now);
  const startDate = new Date(rental.start_date);
  const startDay = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const daysUntilStart = Math.ceil((startDay.getTime() - today.getTime()) / DAY_MS);
  const refundPercentage = daysUntilStart >= 7 ? 1 : daysUntilStart >= 3 ? 0.5 : 0;
  const paidAmount = rentalPaidAmount(rental);
  const refundableAmount = Math.round(paidAmount * refundPercentage * 100) / 100;
  const policyLabel = refundPercentage === 1
    ? "Reembolso del 100 %"
    : refundPercentage === 0.5
      ? "Reembolso del 50 %"
      : "Sin reembolso por proximidad de la fecha";
  return { daysUntilStart, refundPercentage, refundableAmount, policyLabel };
}
