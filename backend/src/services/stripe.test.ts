import { describe, expect, it } from "vitest";
import {
  getPaymentFailureRentalFilter,
  validateCheckoutSession,
} from "./stripe.js";

describe("flujo de pagos de Stripe", () => {
  it("propaga el grupo y el usuario para marcar pagos fallidos", () => {
    expect(getPaymentFailureRentalFilter({
      orderGroupId: "order-group-1",
      userId: "user-1",
    })).toEqual({
      order_group_id: "order-group-1",
      user_id: "user-1",
    });
  });

  it("mantiene compatibilidad con eventos antiguos que contienen rentalId", () => {
    expect(getPaymentFailureRentalFilter({ rentalId: "rental-1" })).toEqual({
      _id: "rental-1",
    });
  });

  it("rechaza una sesión que no confirma un pago", () => {
    const session = {
      status: "complete",
      payment_status: "unpaid",
      metadata: { userId: "user-1" },
      amount_total: 2500,
      currency: "pab",
    } as unknown as import("stripe").Stripe.Checkout.Session;

    expect(() => validateCheckoutSession(session)).toThrow("no confirma un pago");
  });

  it("acepta únicamente una sesión completa pagada en PAB", () => {
    const session = {
      status: "complete",
      payment_status: "paid",
      metadata: { userId: "user-1" },
      amount_total: 2500,
      currency: "pab",
    } as unknown as import("stripe").Stripe.Checkout.Session;

    expect(() => validateCheckoutSession(session)).not.toThrow();
  });
});
