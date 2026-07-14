import { describe, expect, it } from "vitest";
import { getAbandonedPaymentStatus, getAbandonedRentalCutoff } from "./cron.js";

describe("limpieza de reservas abandonadas", () => {
  it("considera abandonada una reserva con más de 35 minutos", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    expect(getAbandonedRentalCutoff(now).toISOString()).toBe("2026-07-14T11:25:00.000Z");
  });

  it("distingue una sesión Stripe expirada de una reserva sin checkout", () => {
    expect(getAbandonedPaymentStatus("cs_test_session")).toBe("expired");
    expect(getAbandonedPaymentStatus()).toBe("cancelled");
  });
});
