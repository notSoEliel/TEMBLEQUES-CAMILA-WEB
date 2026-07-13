export type AppEnvironment = "local" | "ci" | "staging" | "production" | "unknown";

export interface AppConfig {
  appEnv: AppEnvironment;
  authMocksEnabled: boolean;
  integrationsMode: "real" | "demo";
  frontendUrl?: string;
}

const PLACEHOLDER_VALUES = new Set([
  "",
  "sk_test_placeholder",
  "whsec_placeholder",
  "sk_test_your_clerk_secret_key",
  "whsec_your_clerk_webhook_secret",
  "your_cloudinary_cloud_name",
  "your_cloudinary_api_key",
  "your_cloudinary_api_secret",
]);

function readEnvironment(value: string | undefined): AppEnvironment {
  if (value === "local" || value === "ci" || value === "staging" || value === "production") {
    return value;
  }
  return "unknown";
}

function isPlaceholder(value: string | undefined): boolean {
  return value === undefined || PLACEHOLDER_VALUES.has(value);
}

function requiredVariables(environment: AppEnvironment, env: Record<string, string | undefined>): string[] {
  if (environment !== "staging" && environment !== "production") return [];

  const names = [
    "MONGO_URI",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SECRET",
    "FRONTEND_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_PRESET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "MCP_BACKEND_ADMIN_TOKEN",
    "MCP_BACKEND_CLIENT_TOKEN",
  ];

  if (environment === "production") names.push("BACKUP_ENCRYPTION_KEY");

  return names.filter((name) => isPlaceholder(env[name]));
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const appEnv = readEnvironment(env.APP_ENV);
  const authMocksEnabled = env.AUTH_MOCKS_ENABLED === "true";
  const integrationsMode = env.INTEGRATIONS_MODE === "demo" ? "demo" : "real";
  const missing = requiredVariables(appEnv, env);

  if ((appEnv === "staging" || appEnv === "production") && authMocksEnabled) {
    missing.push("AUTH_MOCKS_ENABLED debe ser false");
  }

  if (missing.length > 0) {
    throw new Error(
      `Configuración inválida para APP_ENV=${appEnv}: ${missing.join(", ")}`,
    );
  }

  return {
    appEnv,
    authMocksEnabled,
    integrationsMode,
    frontendUrl: env.FRONTEND_URL,
  };
}
