import { describe, expect, it } from "vitest";
import {
  calculateLateDays,
  calculateLateFeeAmount,
  calculateRentalDays,
  evaluateDeposit,
  getMinimumRentalStartDate,
} from "./payment-rules.js";

describe("reglas de fechas, depósitos y mora", () => {
  it("calcula al menos un día de alquiler", () => {
    expect(calculateRentalDays(new Date("2026-07-20T12:00:00Z"), new Date("2026-07-20T12:00:00Z"))).toBe(1);
    expect(calculateRentalDays(new Date("2026-07-20T12:00:00Z"), new Date("2026-07-23T12:00:00Z"))).toBe(3);
  });

  it("aplica uno o dos días de anticipación según la hora de Panamá", () => {
    const beforeSix = getMinimumRentalStartDate(new Date("2026-07-13T22:59:00.000Z"));
    const afterSix = getMinimumRentalStartDate(new Date("2026-07-13T23:00:00.000Z"));

    expect(beforeSix.toISOString()).toBe("2026-07-14T00:00:00.000Z");
    expect(afterSix.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });

  it("calcula el depósito estándar del 25 %", () => {
    expect(evaluateDeposit(100)).toEqual({ required: true, amount: 25 });
  });

  it("respeta un depósito override positivo", () => {
    expect(evaluateDeposit(100, { required: true, overrideAmount: 80 })).toEqual({ required: true, amount: 80 });
  });

  it("calcula cero días de mora antes o durante la devolución", () => {
    const endDate = new Date("2026-07-12T00:00:00.000Z");
    expect(calculateLateDays(endDate, new Date("2026-07-12T18:00:00.000Z"))).toBe(0);
    expect(calculateLateDays(endDate, new Date("2026-07-11T18:00:00.000Z"))).toBe(0);
  });

  it("calcula días y monto de mora usando la tarifa diaria", () => {
    const endDate = new Date("2026-07-10T00:00:00.000Z");
    const now = new Date("2026-07-12T18:00:00.000Z");
    const lateDays = calculateLateDays(endDate, now);

    expect(lateDays).toBe(2);
    expect(calculateLateFeeAmount({
      total: 300,
      startDate: new Date("2026-07-07T00:00:00.000Z"),
      endDate,
      lateDays,
    })).toBe(200);
  });
});
