import { Hono } from "hono";
import { cors } from "hono/cors";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { connectDB } from "./db.js";
import { seedDatabase } from "./seed.js";
import { migrateToVariants } from "./migrate-variants.js";
import { AppError } from "./lib/errors.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import rentalRoutes from "./routes/rentals.js";
import adminRoutes from "./routes/admin.js";
import stripeRoutes from "./routes/stripe.js";
import settingsRoutes from "./routes/settings.js";
// Aquí unimos los imports de ambas ramas sin dejar marcas
import couponRoutes from "./routes/coupons.js";
import maintenanceRoutes from "./routes/maintenance.js";
import reportRoutes from "./routes/reports.js";
import contactRoutes from "./routes/contact.js";
import mediaRoutes from "./routes/media.js";
import observabilityRoutes from "./routes/observability.js";
import privacyRoutes from "./routes/privacy.js";
import { startCronJobs } from "./services/cron.js";
import { loadConfig } from "./config.js";
import { createRateLimitMiddleware } from "./middleware/rate-limit.js";
import { recordRecentError, requestObservabilityMiddleware, structuredLog } from "./services/observability.js";

const appConfig = loadConfig();

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://frontend:5173",
    appConfig.frontendUrl,
    ...(process.env.CORS_ALLOWED_ORIGINS ?? "").split(","),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin)),
);

const app = new Hono();

app.use("/api/*", async (c, next) => {
  const origin = c.req.header("Origin");
  const method = c.req.method.toUpperCase();
  const isMutable = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (origin && !allowedOrigins.has(origin) && (isMutable || method === "OPTIONS")) {
    throw new AppError("Origen no permitido", 403, "ORIGIN_NOT_ALLOWED");
  }

  await next();
});

// Middleware
app.use("/*", cors({
  origin: (origin) => allowedOrigins.has(origin) ? origin : undefined,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: false,
}));
app.use("/*", requestObservabilityMiddleware);
app.use("/api/*", createRateLimitMiddleware());

// Avoid route-level DB errors while Mongo is still booting.
app.use("/api/*", async (c, next) => {
  if (mongoose.connection.readyState !== 1) {
    return c.json(
      { error: "El servidor se esta iniciando. Intenta nuevamente en unos segundos.", code: "SERVICE_UNAVAILABLE" },
      503,
    );
  }
  await next();
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  const statusCode = err instanceof AppError ? err.statusCode : err instanceof ZodError ? 400 : 500;
  const errorCode = err instanceof AppError ? (err.code ?? "APP_ERROR") : err instanceof ZodError ? "VALIDATION_ERROR" : "INTERNAL_ERROR";
  recordRecentError({
    timestamp: new Date().toISOString(),
    requestId: c.req.header("x-request-id"),
    path: c.req.path,
    code: errorCode,
    statusCode,
  });
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, ...(err.code && { code: err.code }) },
      err.statusCode as any,
    );
  }

  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Error de validación";
    return c.json({ error: message, code: "VALIDATION_ERROR" }, 400);
  }

  const requestId = c.req.header("x-request-id");
  structuredLog("error", "http.unhandled_error", { requestId, path: c.req.path });
  return c.json(
    { error: "Ocurrió un error interno. Por favor, intenta de nuevo.", code: "INTERNAL_ERROR" },
    500,
  );
});
// ─────────────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/products", productRoutes);
app.route("/api/rentals", rentalRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/stripe", stripeRoutes);
app.route("/api/settings", settingsRoutes);
// Aquí registramos pacíficamente todas las rutas combinadas
app.route("/api/coupons", couponRoutes);
app.route("/api/admin/maintenance", maintenanceRoutes);
app.route("/api/admin/reports", reportRoutes);
app.route("/api/contact", contactRoutes);
app.route("/api/media", mediaRoutes);
app.route("/api/admin/observability", observabilityRoutes);
app.route("/api/privacy", privacyRoutes);

// Start server
const PORT = Number(process.env.PORT) || 3000;

function shouldRunSeed(): boolean {
  if (appConfig.appEnv === "production" || process.env.SEED_ENABLED === "false") {
    return false;
  }

  if (process.env.SEED_ENABLED === "true") {
    return true;
  }

  return appConfig.appEnv === "local"
    || appConfig.appEnv === "ci"
    || process.env.NODE_ENV === "development";
}

async function start() {
  await connectDB();
  if (shouldRunSeed()) {
    await seedDatabase();
  }
  await migrateToVariants();

  startCronJobs();

  console.log(`[Server] Tembleques Camila API running on port ${PORT}`);
}

start().catch((error: unknown) => {
  console.error("[Server] No se pudo iniciar el backend:", error);
  process.exitCode = 1;
});

export default {
  port: PORT,
  fetch: app.fetch,
};
