import { Hono } from "hono";
import mongoose from "mongoose";
import { z } from "zod";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { SystemAlert } from "../models/SystemAlert.js";
import { getCronStatus } from "../services/cron.js";
import { getObservabilitySnapshot } from "../services/observability.js";
import { refreshOperationalAlerts } from "../services/alerts.js";
import { isStripeConfigured } from "../services/stripe.js";

const observability = new Hono<{ Variables: AuthVariables }>();
observability.use("/*", authMiddleware);
observability.use("/metrics", requirePermission("observability.read"));
observability.use("/health", requirePermission("observability.read"));
observability.use("/overview", requirePermission("observability.read"));
observability.use("/alerts", requirePermission("observability.read"));
observability.use("/alerts/:id/resolve", requirePermission("observability.write"));

function configured(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && !value.includes("placeholder") && !value.includes("your_"));
}

async function healthSnapshot() {
  const snapshot = getObservabilitySnapshot();
  return {
    checkedAt: new Date().toISOString(),
    database: {
      status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
      state: mongoose.connection.readyState,
    },
    dependencies: {
      clerk: configured("CLERK_SECRET_KEY") ? "configured" : "not_configured",
      stripe: isStripeConfigured() ? "configured" : "not_configured",
      cloudinary: configured("CLOUDINARY_API_SECRET") ? "configured" : "not_configured",
    },
    configuration: {
      appEnv: process.env.APP_ENV ?? "unknown",
      cors: configured("FRONTEND_URL") ? "configured" : "not_configured",
      backups: configured("BACKUP_ENCRYPTION_KEY") ? "configured" : "not_configured",
    },
    cron: getCronStatus(),
    recentErrors: snapshot.recentErrors,
  };
}

observability.get("/metrics", (c) => c.json({ metrics: getObservabilitySnapshot() }));

observability.get("/health", async (c) => c.json({ health: await healthSnapshot() }));

observability.get("/overview", async (c) => {
  await refreshOperationalAlerts();
  const alerts = await SystemAlert.find({ status: "open" }).sort({ createdAt: -1 }).limit(100).lean();
  return c.json({ health: await healthSnapshot(), metrics: getObservabilitySnapshot(), alerts });
});

observability.get("/alerts", async (c) => {
  const status = c.req.query("status") ?? "open";
  const parsedStatus = z.enum(["open", "resolved"]).safeParse(status);
  if (!parsedStatus.success) throw new AppError("Estado de alerta inválido.", 400, "ALERT_STATUS_INVALID");
  const alerts = await SystemAlert.find({ status: parsedStatus.data }).sort({ createdAt: -1 }).limit(100).lean();
  return c.json({ alerts });
});

observability.patch("/alerts/:id/resolve", async (c) => {
  if (!mongoose.isValidObjectId(c.req.param("id"))) {
    throw new AppError("Identificador de alerta inválido.", 400, "ALERT_ID_INVALID");
  }
  const alert = await SystemAlert.findByIdAndUpdate(
    c.req.param("id"),
    { status: "resolved", resolvedAt: new Date(), resolvedBy: c.get("user").clerkId },
    { new: true },
  );
  if (!alert) throw new AppError("Alerta no encontrada.", 404, "ALERT_NOT_FOUND");
  return c.json({ alert });
});

export default observability;
