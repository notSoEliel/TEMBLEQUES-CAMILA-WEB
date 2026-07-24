import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { Incident, type IncidentSeverity, type IncidentStatus, type IncidentType } from "../models/Incident.js";
import { Rental } from "../models/Rental.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { AppError } from "../lib/errors.js";
import { getPaginationParams, createPaginatedResponse } from "../lib/pagination.js";
import { adminAuditMiddleware } from "../services/audit.js";
import { dispatchNotification } from "../services/notifications.js";
import { structuredLog } from "../services/observability.js";

const incidents = new Hono<{ Variables: AuthVariables }>();
incidents.use("/*", authMiddleware, adminAuditMiddleware);
incidents.use("/", requirePermission("incidents.read"));
incidents.use("/:id", requirePermission("incidents.read"));
incidents.post("/", requirePermission("incidents.write"));
incidents.patch("/:id", requirePermission("incidents.write"));

const typeSchema = z.enum(["damage", "late_return", "payment_issue", "customer_complaint", "maintenance", "other"]);
const severitySchema = z.enum(["low", "medium", "high", "critical"]);
const statusSchema = z.enum(["open", "in_review", "resolved", "closed"]);
const STATUS_LABELS: Record<IncidentStatus, string> = { open: "abierta", in_review: "en revisión", resolved: "resuelta", closed: "cerrada" };
const attachmentSchema = z.object({ label: z.string().trim().min(1).max(160), url: z.string().url().max(1000) });
const createSchema = z.object({
  rentalId: z.string().optional(),
  userId: z.string().optional(),
  productId: z.string().optional(),
  type: typeSchema,
  severity: severitySchema.default("medium"),
  description: z.string().trim().min(10).max(3000),
  attachments: z.array(attachmentSchema).max(10).default([]),
});
const updateSchema = z.object({
  status: statusSchema.optional(),
  severity: severitySchema.optional(),
  resolution: z.string().trim().max(3000).optional().nullable(),
  note: z.string().trim().max(1000).optional(),
});

function asObjectId(value: string | undefined, field: string): string | undefined {
  if (!value) return undefined;
  if (!/^[a-f\d]{24}$/i.test(value)) throw new AppError(`${field} inválido`, 400, "VALIDATION_ERROR");
  return value;
}

incidents.get("/", async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const status = c.req.query("status") as IncidentStatus | undefined;
  const severity = c.req.query("severity") as IncidentSeverity | undefined;
  const type = c.req.query("type") as IncidentType | undefined;
  const search = c.req.query("search")?.trim();
  if (status && !statusSchema.safeParse(status).success) throw new AppError("Estado de incidencia inválido", 400, "VALIDATION_ERROR");
  if (severity && !severitySchema.safeParse(severity).success) throw new AppError("Severidad inválida", 400, "VALIDATION_ERROR");
  if (type && !typeSchema.safeParse(type).success) throw new AppError("Tipo de incidencia inválido", 400, "VALIDATION_ERROR");

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (type) filter.type = type;
  if (search) filter.description = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [data, total] = await Promise.all([
    Incident.find(filter)
      .populate("rental_id", "order_group_id status payment_status")
      .populate("user_id", "name email")
      .populate("product_id", "name")
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Incident.countDocuments(filter),
  ]);
  return c.json(createPaginatedResponse(data, total, page, limit));
});

incidents.get("/:id", async (c) => {
  const incident = await Incident.findById(c.req.param("id"))
    .populate("rental_id", "order_group_id status payment_status")
    .populate("user_id", "name email")
    .populate("product_id", "name")
    .populate("timeline.actor_id", "name email role");
  if (!incident) throw new AppError("Incidencia no encontrada", 404, "INCIDENT_NOT_FOUND");
  return c.json({ incident });
});

incidents.post("/", async (c) => {
  const body = createSchema.parse(await c.req.json());
  const actor = c.get("user");
  const rentalId = asObjectId(body.rentalId, "La reserva");
  const userId = asObjectId(body.userId, "El usuario");
  const productId = asObjectId(body.productId, "El producto");
  const rental = rentalId ? await Rental.findById(rentalId) : null;
  if (rentalId && !rental) throw new AppError("Reserva no encontrada", 404, "RENTAL_NOT_FOUND");
  if (userId && !(await User.exists({ _id: userId }))) throw new AppError("Usuario no encontrado", 404, "USER_NOT_FOUND");
  if (productId && !(await Product.exists({ _id: productId }))) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");

  const incident = await Incident.create({
    rental_id: rentalId,
    user_id: userId ?? rental?.user_id,
    product_id: productId ?? rental?.product_id,
    type: body.type,
    severity: body.severity,
    description: body.description,
    attachments: body.attachments,
    timeline: [{ status: "open", note: "Incidencia creada", actor_id: actor._id, timestamp: new Date() }],
    created_by: actor._id,
    updated_by: actor._id,
  });
  const recipientId = incident.user_id?.toString();
  if (recipientId) {
    void User.findById(recipientId).select("email").lean()
      .then((recipient) => dispatchNotification({
        userId: recipientId,
        email: recipient?.email,
        type: "incident_created",
        title: "Incidencia registrada",
        message: "Registramos una incidencia relacionada con tu reserva. Nuestro equipo dará seguimiento al caso.",
        idempotencyKey: `incident:created:${incident._id.toString()}`,
        metadata: { incidentId: incident._id.toString() },
      }))
      .catch((error: unknown) => {
        structuredLog("error", "notification.dispatch_failed", {
          source: "incident.create",
          incidentId: incident._id.toString(),
          type: "incident_created",
          errorCode: error instanceof Error ? error.name : "NOTIFICATION_DISPATCH_FAILED",
        });
      });
  }
  return c.json({ incident }, 201);
});

incidents.patch("/:id", async (c) => {
  const body = updateSchema.parse(await c.req.json());
  const actor = c.get("user");
  const incident = await Incident.findById(c.req.param("id"));
  if (!incident) throw new AppError("Incidencia no encontrada", 404, "INCIDENT_NOT_FOUND");

  const nextStatus = body.status ?? incident.status;
  if (body.status || body.note) {
    incident.timeline.push({ status: nextStatus, note: body.note, actor_id: actor._id, timestamp: new Date() });
  }
  if (body.status) incident.status = body.status;
  if (body.severity) incident.severity = body.severity;
  if (body.resolution !== undefined) incident.resolution = body.resolution ?? undefined;
  incident.updated_by = actor._id;
  await incident.save();
  const recipientId = incident.user_id?.toString();
  if (recipientId) {
    void User.findById(recipientId).select("email").lean()
      .then((recipient) => dispatchNotification({
        userId: recipientId,
        email: recipient?.email,
        type: "incident_updated",
        title: "Incidencia actualizada",
        message: `La incidencia relacionada con tu reserva ahora está: ${STATUS_LABELS[nextStatus]}.`,
        idempotencyKey: `incident:updated:${incident._id.toString()}:${incident.updatedAt.toISOString()}`,
        metadata: { incidentId: incident._id.toString(), status: nextStatus },
      }))
      .catch((error: unknown) => {
        structuredLog("error", "notification.dispatch_failed", {
          source: "incident.update",
          incidentId: incident._id.toString(),
          type: "incident_updated",
          errorCode: error instanceof Error ? error.name : "NOTIFICATION_DISPATCH_FAILED",
        });
      });
  }
  return c.json({ incident });
});

export default incidents;
