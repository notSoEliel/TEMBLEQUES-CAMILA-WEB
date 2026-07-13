import type { Context, Next } from "hono";
import { AppError } from "../lib/errors.js";

export type RateLimitBucket = "public" | "auth" | "checkout" | "admin";

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  limits: Readonly<Record<RateLimitBucket, number>>;
  maxKeys: number;
  trustProxy: boolean;
}

interface BucketState {
  requests: number[];
  lastSeenAt: number;
}

export class RateLimitStore {
  private readonly buckets = new Map<string, BucketState>();

  constructor(private readonly now: () => number = Date.now) {}

  consume(key: string, limit: number, windowMs: number, maxKeys: number): { allowed: boolean; retryAfterSeconds: number } {
    const now = this.now();
    const cutoff = now - windowMs;
    const current = this.buckets.get(key);

    if (!current && this.buckets.size >= maxKeys) {
      this.prune(windowMs);
      if (this.buckets.size >= maxKeys) {
        return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
      }
    }

    const state = current ?? { requests: [], lastSeenAt: now };
    state.requests = state.requests.filter((timestamp) => timestamp > cutoff);
    state.lastSeenAt = now;

    if (state.requests.length >= limit) {
      const oldest = state.requests[0] ?? now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }

    state.requests.push(now);
    this.buckets.set(key, state);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  size(): number {
    return this.buckets.size;
  }

  private prune(windowMs: number): void {
    const cutoff = this.now() - windowMs;
    for (const [key, state] of this.buckets) {
      if (state.lastSeenAt <= cutoff) this.buckets.delete(key);
    }
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadRateLimitConfig(env: Record<string, string | undefined> = process.env): RateLimitConfig {
  return {
    enabled: env.RATE_LIMIT_ENABLED !== "false",
    windowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, 60_000),
    limits: {
      public: positiveInteger(env.RATE_LIMIT_PUBLIC_PER_MINUTE, 120),
      auth: positiveInteger(env.RATE_LIMIT_AUTH_PER_MINUTE, 10),
      checkout: positiveInteger(env.RATE_LIMIT_CHECKOUT_PER_MINUTE, 20),
      admin: positiveInteger(env.RATE_LIMIT_ADMIN_PER_MINUTE, 60),
    },
    maxKeys: positiveInteger(env.RATE_LIMIT_MAX_KEYS, 10_000),
    trustProxy: env.TRUST_PROXY === "true",
  };
}

export function bucketForPath(path: string): RateLimitBucket | null {
  if (path === "/health" || path.endsWith("/webhook")) return null;
  if (path.startsWith("/api/auth")) return "auth";
  if (path.startsWith("/api/admin")) return "admin";
  if (path.startsWith("/api/rentals") || path.startsWith("/api/stripe")) return "checkout";
  return "public";
}

function requestIdentity(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwardedFor) return forwardedFor;
  }
  return c.req.header("x-real-ip")?.trim() || "unknown-client";
}

export function createRateLimitMiddleware(
  config: RateLimitConfig = loadRateLimitConfig(),
  store: RateLimitStore = new RateLimitStore(),
) {
  return async (c: Context, next: Next): Promise<void> => {
    const bucket = bucketForPath(c.req.path);
    if (!config.enabled || !bucket) {
      await next();
      return;
    }

    const key = `${bucket}:${requestIdentity(c, config.trustProxy)}`;
    const result = store.consume(key, config.limits[bucket], config.windowMs, config.maxKeys);
    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSeconds));
      throw new AppError(
        "Demasiadas solicitudes. Intenta nuevamente en unos segundos.",
        429,
        "RATE_LIMIT_EXCEEDED",
      );
    }

    await next();
  };
}
