import { describe, expect, it } from "vitest";
import { calculateCancellationDecision, rentalPaidAmount } from "./cancellation-policy.js";

const baseRental = {
  start_date: new Date("2026-08-20T00:00:00.000Z"),
  total: 428,
  discount_amount: 0,
  payment_type: "reservation" as const,
  deposit_amount: 107,
  stripe_payment_amount: 107,
};

describe("política de cancelación y reembolso", () => {
  it("devuelve el 100 % con siete o más días de anticipación", () => {
    const decision = calculateCancellationDecision(baseRental, new Date("2026-08-13T12:00:00.000Z"));

    expect(decision.refundPercentage).toBe(1);
    expect(decision.refundableAmount).toBe(107);
  });

  it("devuelve el 50 % entre tres y seis días", () => {
    const decision = calculateCancellationDecision(baseRental, new Date("2026-08-15T12:00:00.000Z"));

    expect(decision.refundPercentage).toBe(0.5);
    expect(decision.refundableAmount).toBe(53.5);
  });

  it("no devuelve importe cuando faltan menos de tres días", () => {
    const decision = calculateCancellationDecision(baseRental, new Date("2026-08-18T12:00:00.000Z"));

    expect(decision.refundPercentage).toBe(0);
    expect(decision.refundableAmount).toBe(0);
  });

  it("prioriza el importe realmente cobrado por Stripe", () => {
    expect(rentalPaidAmount({ ...baseRental, stripe_payment_amount: 99.5 })).toBe(99.5);
  });
});
