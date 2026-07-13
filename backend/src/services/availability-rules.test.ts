import { describe, expect, it } from "vitest";
import { hasAvailableStock } from "./availability-rules.js";

const date = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

describe("hasAvailableStock", () => {
  it("permite un rango sin conflictos", () => {
    expect(hasAvailableStock(1, date("2026-07-20"), date("2026-07-22"), [])).toBe(true);
  });

  it("bloquea un rango solapado cuando el stock es uno", () => {
    expect(
      hasAvailableStock(1, date("2026-07-20"), date("2026-07-22"), [
        { startDate: date("2026-07-21"), endDate: date("2026-07-23") },
      ]),
    ).toBe(false);
  });

  it("permite un conflicto cuando quedan unidades disponibles", () => {
    expect(
      hasAvailableStock(2, date("2026-07-20"), date("2026-07-22"), [
        { startDate: date("2026-07-21"), endDate: date("2026-07-23") },
      ]),
    ).toBe(true);
  });

  it("bloquea cuando reservas y mantenimiento consumen todo el stock", () => {
    expect(
      hasAvailableStock(2, date("2026-07-20"), date("2026-07-22"), [
        { startDate: date("2026-07-20"), endDate: date("2026-07-20") },
        { startDate: date("2026-07-20"), endDate: date("2026-07-22") },
      ]),
    ).toBe(false);
  });

  it("ignora conflictos fuera del rango solicitado", () => {
    expect(
      hasAvailableStock(1, date("2026-07-20"), date("2026-07-22"), [
        { startDate: date("2026-07-23"), endDate: date("2026-07-25") },
      ]),
    ).toBe(true);
  });

  it("rechaza rangos invertidos", () => {
    expect(hasAvailableStock(1, date("2026-07-22"), date("2026-07-20"), [])).toBe(false);
  });
});
