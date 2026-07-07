import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
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
import { startCronJobs } from "./services/cron.js";

const app = new Hono();

// Middleware
app.use("/*", cors({
  origin: [
    "http://localhost:5173", 
    "http://frontend:5173",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
  ],
  credentials: true,
}));
app.use("/*", logger());

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

  console.error("[Server] Error no controlado:", err);
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

// Start server
const PORT = Number(process.env.PORT) || 3000;

async function start() {
  await connectDB();
  await seedDatabase();
  await migrateToVariants();

  startCronJobs();

  console.log(`[Server] Tembleques Camila API running on port ${PORT}`);
}

start();

export default {
  port: PORT,
  fetch: app.fetch,
};