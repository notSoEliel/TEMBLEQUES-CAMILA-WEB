import { afterEach, describe, expect, it } from "vitest";
import {
  getObservabilitySnapshot,
  recordMetric,
  recordRequestDuration,
  resetObservabilityForTests,
  structuredLog,
} from "./observability.js";

describe("observabilidad", () => {
  afterEach(() => resetObservabilityForTests());

  it("agrega métricas por nombre y etiquetas", () => {
    recordMetric("checkout_started_total", 1, { mode: "stripe" });
    recordMetric("checkout_started_total", 2, { mode: "stripe" });
    const snapshot = getObservabilitySnapshot();
    expect(snapshot.counters).toEqual([{ name: "checkout_started_total", value: 3, labels: { mode: "stripe" } }]);
  });

  it("calcula latencia promedio y p95", () => {
    recordRequestDuration(10);
    recordRequestDuration(20);
    recordRequestDuration(30);
    const latency = getObservabilitySnapshot().latency;
    expect(latency.requestCount).toBe(3);
    expect(latency.averageMs).toBe(20);
    expect(latency.p95Ms).toBe(30);
  });

  it("redacta credenciales en logs estructurados", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (message?: unknown) => { output = String(message); };
    structuredLog("info", "test.event", { authorization: "Bearer secreto" });
    console.log = originalLog;
    expect(output).toContain('"authorization":"[redactado]"');
  });
});
