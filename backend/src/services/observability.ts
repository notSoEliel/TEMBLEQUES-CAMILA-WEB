import { randomUUID } from "node:crypto";
import type { Context, Next } from "hono";
import { sanitizeAuditMetadata } from "./audit.js";

export type MetricLabels = Record<string, string>;
export type LogLevel = "info" | "warn" | "error";

export interface MetricPoint {
  name: string;
  value: number;
  labels: MetricLabels;
}

export interface ObservabilitySnapshot {
  generatedAt: string;
  counters: MetricPoint[];
  latency: {
    requestCount: number;
    averageMs: number;
    p95Ms: number;
  };
  recentErrors: RecentError[];
}

export interface RecentError {
  timestamp: string;
  requestId?: string;
  path?: string;
  code: string;
  statusCode: number;
}

const counters = new Map<string, MetricPoint>();
const requestDurations: number[] = [];
const recentErrors: RecentError[] = [];

function metricKey(name: string, labels: MetricLabels): string {
  return `${name}:${Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join(",")}`;
}

export function recordMetric(name: string, value = 1, labels: MetricLabels = {}): void {
  const key = metricKey(name, labels);
  const current = counters.get(key);
  if (current) {
    current.value += value;
    return;
  }
  counters.set(key, { name, value, labels });
}

export function recordRequestDuration(durationMs: number): void {
  requestDurations.push(Math.round(durationMs * 100) / 100);
  if (requestDurations.length > 500) requestDurations.shift();
}

export function recordRecentError(error: RecentError): void {
  recentErrors.unshift(error);
  if (recentErrors.length > 30) recentErrors.pop();
}

export function getObservabilitySnapshot(): ObservabilitySnapshot {
  const sortedDurations = [...requestDurations].sort((a, b) => a - b);
  const p95Index = sortedDurations.length === 0 ? 0 : Math.ceil(sortedDurations.length * 0.95) - 1;
  const total = sortedDurations.reduce((sum, value) => sum + value, 0);
  return {
    generatedAt: new Date().toISOString(),
    counters: [...counters.values()],
    latency: {
      requestCount: sortedDurations.length,
      averageMs: sortedDurations.length === 0 ? 0 : Math.round((total / sortedDurations.length) * 100) / 100,
      p95Ms: sortedDurations[p95Index] ?? 0,
    },
    recentErrors: [...recentErrors],
  };
}

export function resetObservabilityForTests(): void {
  counters.clear();
  requestDurations.length = 0;
  recentErrors.length = 0;
}

export function structuredLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const payload = sanitizeAuditMetadata({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export async function requestObservabilityMiddleware(c: Context, next: Next): Promise<void> {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  const startedAt = performance.now();
  c.header("X-Request-Id", requestId);

  try {
    await next();
  } finally {
    const durationMs = performance.now() - startedAt;
    const statusCode = c.res.status || 200;
    recordMetric("http_requests_total", 1, {
      method: c.req.method,
      path: c.req.path,
      status: String(statusCode),
    });
    recordRequestDuration(durationMs);
    structuredLog(statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info", "http.request", {
      requestId,
      method: c.req.method,
      path: c.req.path,
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  }
}
