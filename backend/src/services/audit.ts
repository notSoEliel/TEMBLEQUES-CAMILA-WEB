import type { Context, Next } from "hono";
import { randomUUID } from "node:crypto";
import { AdminAuditLog, type AuditSource } from "../models/AdminAuditLog.js";
import type { AuthVariables } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";

type AuditContext = Context<{ Variables: AuthVariables }>;

const SENSITIVE_KEY = /(token|secret|password|authorization|api.?key|signature|card|cvc)/i;

export function sanitizeAuditMetadata(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncado]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeAuditMetadata(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? "[redactado]" : sanitizeAuditMetadata(nestedValue, depth + 1);
  }
  return output;
}

function sourceFor(clerkId: string, source: "web" | "mcp" | "service" | undefined): AuditSource {
  if (source === "mcp" || source === "service") return "mcp";
  return clerkId.startsWith("mcp_") ? "mcp" : "web";
}

function actionFor(method: string, path: string): string {
  if (path.endsWith("/role")) return "user.role.update";
  if (path.includes("/status")) return "status.update";
  if (method === "POST") return "create";
  if (method === "PUT" || method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  return "request";
}

function entityFor(path: string): { entity: string; entityId?: string } {
  const segments = path.split("/").filter(Boolean);
  const adminIndex = segments.indexOf("admin");
  const entity = segments[adminIndex + 1] ?? "admin";
  const possibleId = segments[adminIndex + 2];
  return {
    entity,
    entityId: possibleId && possibleId !== "status" && possibleId !== "role" ? possibleId : undefined,
  };
}

async function requestMetadata(c: AuditContext): Promise<Record<string, unknown> | undefined> {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;
  try {
    const body = await c.req.raw.clone().json() as unknown;
    return { payload: sanitizeAuditMetadata(body) as Record<string, unknown> };
  } catch {
    return undefined;
  }
}

export async function recordAdminAudit(
  c: AuditContext,
  details: {
    statusCode: number;
    success: boolean;
    errorCode?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const user = c.get("user");
  const method = c.req.method.toUpperCase();
  const path = c.req.path;
  const { entity, entityId } = entityFor(path);
  const metadata = details.metadata ?? await requestMetadata(c);

  try {
    await AdminAuditLog.create({
      actorUserId: user._id,
      actorClerkId: user.clerkId,
      actorRole: user.role,
      action: actionFor(method, path),
      entity,
      entityId,
      source: sourceFor(user.clerkId, c.get("authSource")),
      method,
      path,
      requestId: details.requestId ?? c.req.header("x-request-id") ?? randomUUID(),
      ipAddress: c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
        ?? c.req.header("x-real-ip")
        ?? "unknown-client",
      userAgent: c.req.header("user-agent") ?? "unknown",
      statusCode: details.statusCode,
      success: details.success,
      metadata: details.errorCode ? { ...metadata, errorCode: details.errorCode } : metadata,
    });
  } catch (error) {
    console.error("[Audit] No se pudo guardar el evento administrativo:", error);
  }
}

export const adminAuditMiddleware = async (c: AuditContext, next: Next): Promise<void> => {
  const method = c.req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    await next();
    return;
  }

  const requestId = c.req.header("x-request-id") ?? randomUUID();
  c.header("X-Request-Id", requestId);
  let failure: unknown;

  try {
    await next();
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    const appError = failure instanceof AppError ? failure : undefined;
    await recordAdminAudit(c, {
      requestId,
      statusCode: appError?.statusCode ?? (failure ? 500 : c.res.status),
      success: !failure && c.res.status < 400,
      errorCode: appError?.code,
    });
  }
};
