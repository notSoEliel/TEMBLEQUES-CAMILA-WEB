import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { connectDB } from "./db.js";
import { seedDatabase } from "./seed.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import rentalRoutes from "./routes/rentals.js";
import adminRoutes from "./routes/admin.js";
import stripeRoutes from "./routes/stripe.js";

const app = new Hono();

// Middleware
app.use("/*", cors({
  origin: ["http://localhost:5173", "http://frontend:5173"],
  credentials: true,
}));
app.use("/*", logger());

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
