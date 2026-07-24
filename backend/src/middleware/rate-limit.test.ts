import { describe, expect, it } from "vitest";
import { RateLimitStore, bucketForPath, loadRateLimitConfig } from "./rate-limit.js";

describe("rate limiting", () => {
  it("permite hasta el límite y rechaza el siguiente intento", () => {
    let now = 1_000;
    const store = new RateLimitStore(() => now);

    expect(store.consume("public:1", 2, 60_000, 10).allowed).toBe(true);
    expect(store.consume("public:1", 2, 60_000, 10).allowed).toBe(true);
    const rejected = store.consume("public:1", 2, 60_000, 10);

    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSeconds).toBeGreaterThan(0);

    now += 60_001;
    expect(store.consume("public:1", 2, 60_000, 10).allowed).toBe(true);
  });

  it("aísla las categorías y limita el tamaño del almacenamiento", () => {
    const store = new RateLimitStore(() => 1_000);
    expect(store.consume("public:1", 1, 60_000, 2).allowed).toBe(true);
    expect(store.consume("admin:1", 1, 60_000, 2).allowed).toBe(true);
    expect(store.consume("checkout:1", 1, 60_000, 2).allowed).toBe(false);
    expect(store.size()).toBe(2);
  });

  it("clasifica rutas sensibles y excluye webhooks y health", () => {
    expect(bucketForPath("/health")).toBeNull();
    expect(bucketForPath("/api/auth/me")).toBe("auth");
    expect(bucketForPath("/api/admin/users")).toBe("admin");
    expect(bucketForPath("/api/stripe/create-checkout-session")).toBe("checkout");
    expect(bucketForPath("/api/auth/webhook")).toBeNull();
  });

  it("usa valores seguros por defecto y permite configurar límites", () => {
    const config = loadRateLimitConfig({
      RATE_LIMIT_PUBLIC_PER_MINUTE: "3",
      RATE_LIMIT_MAX_KEYS: "50",
      TRUST_PROXY: "true",
    });

    expect(config.limits.public).toBe(3);
    expect(config.maxKeys).toBe(50);
    expect(config.trustProxy).toBe(true);
  });
});
