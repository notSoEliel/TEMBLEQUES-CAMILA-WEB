import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "./audit.js";

describe("auditoría administrativa", () => {
  it("redacta secretos y limita estructuras profundas", () => {
    const value = sanitizeAuditMetadata({
      role: "operator",
      authorization: "Bearer token-real",
      nested: { apiKey: "secret-value" },
    }) as Record<string, unknown>;

    expect(value.role).toBe("operator");
    expect(value.authorization).toBe("[redactado]");
    expect((value.nested as Record<string, unknown>).apiKey).toBe("[redactado]");
  });
});
