import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const secureStaging = {
  APP_ENV: "staging",
  MONGO_URI: "mongodb+srv://staging",
  CLERK_SECRET_KEY: "sk_test_clerk",
  CLERK_WEBHOOK_SECRET: "whsec_clerk",
  FRONTEND_URL: "https://staging.example.com",
  CLOUDINARY_CLOUD_NAME: "staging-cloud",
  CLOUDINARY_API_KEY: "cloud-key",
  CLOUDINARY_API_SECRET: "cloud-secret",
  CLOUDINARY_UPLOAD_PRESET: "preset",
  STRIPE_SECRET_KEY: "sk_test_stripe",
  STRIPE_WEBHOOK_SECRET: "whsec_stripe",
  MCP_BACKEND_ADMIN_TOKEN: "internal-admin-token",
  MCP_BACKEND_CLIENT_TOKEN: "internal-client-token",
};

describe("configuración segura", () => {
  it("acepta staging únicamente con secretos reales y mocks desactivados", () => {
    const config = loadConfig(secureStaging);
    expect(config.appEnv).toBe("staging");
    expect(config.authMocksEnabled).toBe(false);
  });

  it("enumera variables faltantes sin imprimir valores", () => {
    expect(() => loadConfig({ APP_ENV: "production" })).toThrow(
      /MONGO_URI.*CLERK_SECRET_KEY.*STRIPE_WEBHOOK_SECRET.*BACKUP_ENCRYPTION_KEY/,
    );
  });

  it("exige la clave de respaldo en producción", () => {
    expect(() => loadConfig({ ...secureStaging, APP_ENV: "production" })).toThrow("BACKUP_ENCRYPTION_KEY");
    expect(loadConfig({ ...secureStaging, APP_ENV: "production", BACKUP_ENCRYPTION_KEY: "a".repeat(64) }).appEnv).toBe("production");
  });

  it("rechaza mocks explícitos en staging", () => {
    expect(() => loadConfig({ ...secureStaging, AUTH_MOCKS_ENABLED: "true" })).toThrow(
      "AUTH_MOCKS_ENABLED debe ser false",
    );
  });

  it("permite placeholders únicamente en CI/local", () => {
    const config = loadConfig({
      APP_ENV: "ci",
      AUTH_MOCKS_ENABLED: "true",
      INTEGRATIONS_MODE: "demo",
    });
    expect(config.integrationsMode).toBe("demo");
  });
});
