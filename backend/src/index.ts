import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { connectDB } from "./db.js";
import { seedDatabase } from "./seed.js";
import { AppError } from "./lib/errors.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import rentalRoutes from "./routes/rentals.js";
import adminRoutes from "./routes/admin.js";
import stripeRoutes from "./routes/stripe.js";

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
// All unhandled errors bubble up here. Never exposes raw stack traces or
// internal MongoDB/Mongoose messages to the client.
app.onError((err, c) => {
  // Known application errors (thrown with AppError)
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, ...(err.code && { code: err.code }) },
      err.statusCode as any,
    );
  }

  // Zod validation errors — extract the first human-readable message
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Error de validación";
    return c.json({ error: message, code: "VALIDATION_ERROR" }, 400);
  }

  // Unexpected server errors — log internally, return safe message
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

// Start server
const PORT = Number(process.env.PORT) || 3000;

async function start() {
  await connectDB();
  await seedDatabase();

  console.log(`[Server] Tembleques Camila API running on port ${PORT}`);
}

start();

export default {
  port: PORT,
  fetch: app.fetch,
};
