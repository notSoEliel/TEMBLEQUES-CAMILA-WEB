import { describe, expect, it } from "vitest";
import { maintenanceRangesOverlap, parseMaintenanceRange } from "./maintenance-rules.js";

describe("reglas de mantenimiento", () => {
  it("acepta un rango cronológico válido", () => {
    const range = parseMaintenanceRange("2026-08-10", "2026-08-12");
    expect(range?.startDate.toISOString().startsWith("2026-08-10")).toBe(true);
  });

  it("rechaza fechas invertidas o inválidas", () => {
    expect(parseMaintenanceRange("2026-08-12", "2026-08-10")).toBeNull();
    expect(parseMaintenanceRange("no-es-fecha", "2026-08-10")).toBeNull();
  });

  it("detecta solapamientos, pero permite rangos consecutivos", () => {
    const first = parseMaintenanceRange("2026-08-10", "2026-08-12");
    const overlapping = parseMaintenanceRange("2026-08-11", "2026-08-13");
    const consecutive = parseMaintenanceRange("2026-08-12", "2026-08-14");
    expect(first && overlapping && maintenanceRangesOverlap(first, overlapping)).toBe(true);
    expect(first && consecutive && maintenanceRangesOverlap(first, consecutive)).toBe(false);
  });
});
