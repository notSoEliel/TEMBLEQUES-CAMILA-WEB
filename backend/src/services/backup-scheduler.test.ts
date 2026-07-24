import { describe, expect, it } from "vitest";
import { getNextBackupDelayMs } from "./backup-scheduler.js";

describe("programador de respaldos", () => {
  it("programa el siguiente respaldo a las 03:00 UTC del mismo día", () => {
    const now = new Date("2026-07-14T01:30:00.000Z");
    expect(getNextBackupDelayMs(now)).toBe(90 * 60 * 1000);
  });

  it("programa el siguiente respaldo para el día siguiente después de las 03:00 UTC", () => {
    const now = new Date("2026-07-14T04:00:00.000Z");
    expect(getNextBackupDelayMs(now)).toBe(23 * 60 * 60 * 1000);
  });
});
