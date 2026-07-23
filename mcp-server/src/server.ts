import { McpServer, type RegisteredTool, type ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AnySchema, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  hasMcpScope,
  MCP_ADMIN_SCOPES,
  type McpPrincipal,
  type McpScope,
} from "./auth.js";
import { createMcpIdentityAssertion } from "./identity.js";

type AuthMode = "public" | "client" | "admin";
type ToolInputSchema = undefined | ZodRawShapeCompat | AnySchema;
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ApiResult = {
  status: number;
  data: JsonValue;
  requestId: string;
};

type BackendErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
  code?: string;
  message?: string;
};

const backendUrl = (process.env.MCP_BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const adminToken = process.env.MCP_BACKEND_ADMIN_TOKEN ?? process.env.MCP_ADMIN_TOKEN;
const clientToken = process.env.MCP_BACKEND_CLIENT_TOKEN ?? process.env.MCP_CLIENT_TOKEN;
const bridgeToken = process.env.MCP_BACKEND_MCP_TOKEN;
const DEFAULT_TIMEOUT_MS = 15_000;
const PAYMENT_TIMEOUT_MS = 30_000;

const TOOL_SCOPES: Readonly<Record<string, McpScope>> = {
  "admin.dashboard.summary": "dashboard.read",
  "catalog.products.search": "catalog.read",
  "catalog.availability.check": "availability.read",
  "rentals.draft.create": "rentals.create",
  "payments.checkout.create": "payments.create",
  "rentals.mine.list": "rentals.read.own",
  "rentals.pending.cancel": "rentals.cancel.own",
  "admin.rentals.list": "reservations.read",
  "admin.rentals.status.update": "reservations.write",
  "admin.calendar.range": "reservations.read",
  "admin.products.upsert": "products.write",
  "admin.inventory.variantMaintenance.set": "maintenance.write",
  "admin.users.search": "users.read",
  "admin.users.detail": "users.read",
  "reports.operations.generate": "reports.read",
  "security.audit.search": "audit.read",
  "ops.health.check": "observability.read",
  "payments.reconcile.run": "payments.reconcile",
};

function toolIsVisible(name: string, principal: McpPrincipal): boolean {
  const scope = TOOL_SCOPES[name];
  return scope !== undefined && hasMcpScope(principal, scope);
}

function registerVisibleTool<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends ToolInputSchema>(
  server: McpServer,
  principal: McpPrincipal,
  name: string,
  config: {
    title?: string;
    description?: string;
    inputSchema?: InputArgs;
    outputSchema?: OutputArgs;
    annotations?: ToolAnnotations;
    _meta?: Record<string, unknown>;
  },
  callback: ToolCallback<InputArgs>,
): RegisteredTool {
  const tool = server.registerTool(name, config, callback);
  if (!toolIsVisible(name, principal)) tool.disable();
  return tool;
}

function tokenFor(mode: AuthMode): string | undefined {
  if (mode === "admin") return adminToken;
  if (mode === "client") return clientToken;
  return undefined;
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const value = query.toString();
  return value ? `?${value}` : "";
}

function requiredScopeFor(path: string, mode: AuthMode, method: string): McpScope | undefined {
  if (mode === "public") {
    if (path.includes("/availability")) return "availability.read";
    if (path.startsWith("/api/products")) return "catalog.read";
    return undefined;
  }

  if (mode === "client") {
    if (path === "/api/rentals" && method === "POST") return "rentals.create";
    if (path.startsWith("/api/rentals/my")) return "rentals.read.own";
    if (path.startsWith("/api/rentals/") && method === "POST") return "rentals.cancel.own";
    if (path.startsWith("/api/stripe/")) return "payments.create";
    return undefined;
  }

  if (path.includes("/dashboard")) return "dashboard.read";
  if (path === "/api/admin/audit") return "audit.read";
  if (path.includes("/users/") && path.includes("/audit")) return "audit.read";
  if (path.startsWith("/api/admin/users")) return "users.read";
  if (path.includes("/maintenance")) return "inventory.write";
  if (path.startsWith("/api/admin/products")) return "products.write";
  if (path.includes("/reports")) return "reports.read";
  if (path.includes("/observability")) return "observability.read";
  if (path === "/api/admin/payments/reconcile") return "payments.reconcile";
  if (path.includes("/settings")) return "settings.write";
  if (path.endsWith("/status") && path.startsWith("/api/admin/rentals/")) return "reservations.write";
  if (path.startsWith("/api/admin/rentals")) return "reservations.read";
  return undefined;
}

function safeBackendMessage(status: number): { code: string; message: string } {
  if (status === 400) return { code: "BACKEND_VALIDATION_ERROR", message: "La solicitud no es válida." };
  if (status === 401) return { code: "BACKEND_AUTHENTICATION_ERROR", message: "La autenticación del backend fue rechazada." };
  if (status === 403) return { code: "BACKEND_FORBIDDEN", message: "La identidad no tiene permisos para esta operación." };
  if (status === 404) return { code: "BACKEND_NOT_FOUND", message: "El recurso solicitado no existe." };
  if (status === 409) return { code: "BACKEND_CONFLICT", message: "La operación entra en conflicto con el estado actual." };
  if (status >= 500) return { code: "BACKEND_UNAVAILABLE", message: "El backend no pudo completar la operación." };
  return { code: "BACKEND_REQUEST_FAILED", message: "El backend rechazó la operación." };
}

function normalizeBackendError(status: number, data: JsonValue, requestId: string): McpError {
  const fallback = safeBackendMessage(status);
  const payload = typeof data === "object" && data !== null && !Array.isArray(data)
    ? data as BackendErrorPayload
    : {};
  const backendCode = payload.error?.code ?? payload.code;
  const code = backendCode && /^[A-Z][A-Z0-9_]{2,60}$/.test(backendCode)
    ? backendCode
    : fallback.code;

  return new McpError(
    ErrorCode.InvalidRequest,
    `${fallback.message} Código: ${code}. requestId: ${requestId}`,
  );
}

function response(data: JsonValue, requestId: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ requestId, data }, null, 2),
      },
    ],
  };
}

function createBackendApi(principal: McpPrincipal) {
  return async function api(
    path: string,
    mode: AuthMode = "public",
    init: RequestInit = {},
    scopeOverride?: McpScope,
  ): Promise<ApiResult> {
    const method = (init.method ?? "GET").toUpperCase();
    const scope = scopeOverride ?? requiredScopeFor(path, mode, method);
    if (scope && !hasMcpScope(principal, scope)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `La credencial MCP no tiene el permiso requerido: ${scope}`,
      );
    }

    const requestId = `mcp-${crypto.randomUUID()}`;
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("x-request-id", requestId);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    if (principal.kind === "oauth" && mode !== "public") {
      if (!bridgeToken) {
        throw new McpError(
          ErrorCode.InternalError,
          `La configuración interna no tiene MCP_BACKEND_MCP_TOKEN. requestId: ${requestId}`,
        );
      }
      headers.set("Authorization", `Bearer ${bridgeToken}`);
      headers.set("X-MCP-Identity-Assertion", await createMcpIdentityAssertion(principal, requestId));
    } else {
      const token = tokenFor(mode);
      if (mode !== "public" && !token) {
        throw new McpError(
          ErrorCode.InternalError,
          `La configuración interna no tiene credencial para ${mode}. requestId: ${requestId}`,
        );
      }
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeoutMs = path.includes("/stripe/") || path.includes("/reconcile")
      ? PAYMENT_TIMEOUT_MS
      : DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const backendResponse = await fetch(`${backendUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      const raw = await backendResponse.text();
      let data: JsonValue;
      try {
        data = raw ? JSON.parse(raw) as JsonValue : null;
      } catch {
        data = { text: raw.slice(0, 2000) };
      }

      if (!backendResponse.ok) {
        throw normalizeBackendError(backendResponse.status, data, requestId);
      }

      return { status: backendResponse.status, data, requestId };
    } catch (error) {
      if (error instanceof McpError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new McpError(
          ErrorCode.InternalError,
          `El backend tardó demasiado en responder. requestId: ${requestId}`,
        );
      }
      throw new McpError(
        ErrorCode.InternalError,
        `No fue posible comunicarse con el backend. requestId: ${requestId}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

const pageSchema = z.number().int().min(1).max(1000).default(1);
const limitSchema = z.number().int().min(1).max(100).default(10);
const productCategorySchema = z.enum([
  "pollera",
  "vestuario_masculino",
  "infantil",
  "tembleques",
  "accesorios",
  "paquete_completo",
]);
const variantSchema = z.object({
  size: z.string().min(1).max(50),
  stock: z.number().min(0).max(100_000),
  price_override: z.number().min(0).nullable().optional(),
  in_maintenance: z.boolean().default(false),
});
const productSchema = z.object({
  name: z.string().min(1).max(200),
  name_en: z.string().max(200).optional(),
  description: z.string().min(1).max(5000),
  description_en: z.string().max(5000).optional(),
  category: z.array(productCategorySchema).min(1),
  rental_price: z.number().min(0).max(1_000_000),
  variants: z.array(variantSchema).min(1),
  images: z.array(z.string().url()).max(20).optional(),
  deposit_settings: z.object({
    required: z.boolean().default(false),
    overrideAmount: z.number().min(0).nullable().optional(),
  }).optional(),
});

export function createTemblequesMcpServer(principal?: McpPrincipal): McpServer {
  const effectivePrincipal: McpPrincipal = principal ?? {
    id: "stdio-local",
    kind: "service",
    mode: "admin",
    role: "owner",
    serviceName: "admin",
    scopes: MCP_ADMIN_SCOPES,
  };
  const api = createBackendApi(effectivePrincipal);
  const server = new McpServer({ name: "tembleques-camila", version: "1.1.0" });

  registerVisibleTool(server, effectivePrincipal, "admin.dashboard.summary", {
    title: "Resumen administrativo",
    description: "Consulta KPIs agregados del dashboard administrativo. Requiere dashboard.read.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async () => {
    const result = await api("/api/admin/dashboard", "admin");
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "catalog.products.search", {
    title: "Buscar productos",
    description: "Busca productos del catálogo por texto, categoría, talla, precio y fechas.",
    inputSchema: {
      search: z.string().trim().max(100).optional(),
      category: z.string().trim().max(100).optional(),
      size: z.string().trim().max(50).optional(),
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      startDate: z.string().trim().optional(),
      endDate: z.string().trim().optional(),
      page: pageSchema,
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async (input) => {
    const result = await api(`/api/products${toQuery(input)}`);
    return response(redactPublicProducts(result.data), result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "catalog.availability.check", {
    title: "Consultar disponibilidad",
    description: "Consulta fechas reservadas o bloqueadas de un producto.",
    inputSchema: {
      productId: z.string().min(1),
      from: z.string().trim().optional(),
      to: z.string().trim().optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ productId, from, to }) => {
    const result = await api(`/api/products/${productId}/availability${toQuery({ from, to })}`);
    return response(redactPublicAvailability(result.data), result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "rentals.draft.create", {
    title: "Crear reserva pendiente",
    description: "Crea una reserva pendiente para el usuario Clerk autenticado. Requiere consentimiento explícito.",
    inputSchema: {
      productId: z.string().min(1),
      selectedSize: z.string().min(1),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      termsAccepted: z.literal(true),
      paymentType: z.enum(["reservation", "full"]).default("reservation"),
      orderGroupId: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async (input) => {
    const result = await api("/api/rentals", "client", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "payments.checkout.create", {
    title: "Crear checkout",
    description: "Crea una sesión de Stripe para reservas propias pendientes.",
    inputSchema: {
      rentalId: z.string().optional(),
      rentalIds: z.array(z.string()).min(1).optional(),
      orderGroupId: z.string().optional(),
      paymentType: z.enum(["reservation", "full"]).optional(),
      couponCode: z.string().trim().max(100).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async (input) => {
    const result = await api("/api/stripe/create-checkout-session", "client", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "rentals.mine.list", {
    title: "Listar mis reservas",
    description: "Lista reservas del usuario Clerk autenticado.",
    inputSchema: {
      view: z.enum(["active", "cancelled"]).default("active"),
      page: pageSchema,
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async (input) => {
    const result = await api(`/api/rentals/my${toQuery(input)}`, "client");
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "rentals.pending.cancel", {
    title: "Cancelar reserva pendiente",
    description: "Cancela únicamente una reserva propia en estado pending y no genera reembolso.",
    inputSchema: { rentalId: z.string().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }, async ({ rentalId }) => {
    const result = await api(`/api/rentals/${rentalId}/cancel-pending`, "client", { method: "POST" });
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.rentals.list", {
    title: "Listar reservas administrativas",
    description: "Lista reservas administrativas con filtros por estado, texto y paginación.",
    inputSchema: {
      status: z.string().trim().max(50).optional(),
      search: z.string().trim().max(100).optional(),
      sort: z.enum(["asc", "desc"]).default("desc"),
      page: pageSchema,
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async (input) => {
    const result = await api(`/api/admin/rentals${toQuery(input)}`, "admin");
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.rentals.status.update", {
    title: "Actualizar estado de reserva",
    description: "Actualiza el estado operativo aplicando las transiciones de negocio y auditando la acción.",
    inputSchema: {
      rentalId: z.string().min(1),
      status: z.enum(["pending", "reserved", "paid", "confirmed", "delivered", "returned", "late", "damaged", "cancelled"]),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }, async ({ rentalId, status }) => {
    const result = await api(`/api/admin/rentals/${rentalId}/status`, "admin", {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, "reservations.write");
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.calendar.range", {
    title: "Consultar calendario administrativo",
    description: "Consulta eventos de reservas por rango de fechas.",
    inputSchema: {
      from: z.string().min(1),
      to: z.string().min(1),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async (input) => {
    const result = await api(`/api/admin/rentals/calendar${toQuery(input)}`, "admin");
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.products.upsert", {
    title: "Crear o editar producto",
    description: "Crea o edita un producto con esquema explícito y validaciones de inventario.",
    inputSchema: {
      productId: z.string().optional(),
      product: productSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }, async ({ productId, product }) => {
    const result = await api(
      productId ? `/api/admin/products/${productId}` : "/api/admin/products",
      "admin",
      { method: productId ? "PUT" : "POST", body: JSON.stringify(product) },
    );
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.inventory.variantMaintenance.set", {
    title: "Marcar variante en mantenimiento",
    description: "Activa o desactiva el mantenimiento permanente de una variante, separado de los bloqueos temporales.",
    inputSchema: {
      productId: z.string().min(1),
      selectedSize: z.string().min(1),
      inMaintenance: z.boolean(),
      reason: z.string().trim().min(5).max(500).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  }, async ({ productId, selectedSize, inMaintenance, reason }) => {
    const result = await api(
      `/api/admin/products/${productId}/variants/${encodeURIComponent(selectedSize)}/maintenance`,
      "admin",
      { method: "PATCH", body: JSON.stringify({ inMaintenance, reason }) },
      "maintenance.write",
    );
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.users.search", {
    title: "Buscar clientes",
    description: "Busca clientes por nombre, correo o teléfono con paginación.",
    inputSchema: {
      search: z.string().trim().max(100).optional(),
      page: pageSchema,
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async (input) => {
    const result = await api(`/api/admin/users${toQuery(input)}`, "admin");
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "admin.users.detail", {
    title: "Detalle de cliente",
    description: "Consulta perfil, estadísticas e historial paginado con datos sensibles filtrados.",
    inputSchema: {
      userId: z.string().min(1),
      page: pageSchema,
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ userId, page, limit }) => {
    const [user, stats, audit, rentals] = await Promise.all([
      api(`/api/admin/users/${userId}`, "admin"),
      api(`/api/admin/users/${userId}/stats`, "admin"),
      api(`/api/admin/users/${userId}/audit`, "admin"),
      api(`/api/admin/users/${userId}/rentals${toQuery({ page, limit })}`, "admin"),
    ]);
    return response({
      user: redactUser(user.data),
      stats: stats.data,
      audit: redactUserAudit(audit.data),
      rentals: redactRentals(rentals.data),
    }, user.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "reports.operations.generate", {
    title: "Generar reporte operativo",
    description: "Genera reportes de inventario y rotación en JSON, CSV o resumen textual.",
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
      category: z.string().trim().max(100).optional(),
      productId: z.string().optional(),
      search: z.string().trim().max(100).optional(),
      format: z.enum(["json", "csv", "summary"]).default("json"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ format, ...filters }) => {
    const path = format === "csv"
      ? "/api/admin/reports/export-csv"
      : "/api/admin/reports/inventory-stats";
    const result = await api(`${path}${toQuery(filters)}`, "admin");
    if (format === "summary") return response(createReportSummary(result.data), result.requestId);
    return response(result.data, result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "security.audit.search", {
    title: "Consultar auditoría",
    description: "Consulta el registro global de acciones administrativas con filtros y paginación.",
    inputSchema: {
      action: z.string().trim().max(100).optional(),
      entity: z.string().trim().max(100).optional(),
      success: z.enum(["true", "false"]).optional(),
      page: pageSchema,
      limit: z.number().int().min(1).max(100).default(20),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async (input) => {
    const result = await api(`/api/admin/audit${toQuery(input)}`, "admin");
    return response(redactAudit(result.data), result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "ops.health.check", {
    title: "Salud técnica",
    description: "Consulta observabilidad protegida de backend y dependencias configuradas.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async () => {
    const result = await api("/api/admin/observability/overview", "admin", {}, "observability.read");
    return response(redactObservability(result.data), result.requestId);
  });

  registerVisibleTool(server, effectivePrincipal, "payments.reconcile.run", {
    title: "Conciliación de pagos",
    description: "Compara reservas internas, Checkout Sessions, PaymentIntents y webhooks de Stripe.",
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, async () => {
    const result = await api("/api/admin/payments/reconcile", "admin", { method: "POST" });
    return response(result.data, result.requestId);
  });

  return server;
}

function redactUser(data: JsonValue): JsonValue {
  if (!isRecord(data)) return data;
  const user = isRecord(data.user) ? data.user : data;
  return {
    user: pick(user, ["_id", "name", "email", "phone", "preferredLanguage", "role", "createdAt", "updatedAt"]),
  };
}

function redactPublicProducts(data: JsonValue): JsonValue {
  if (!isRecord(data)) return { data: [] };
  const items = Array.isArray(data.data) ? data.data : [];
  return {
    data: items.map((item) => {
      if (!isRecord(item)) return {};
      const variants = Array.isArray(item.variants) ? item.variants : [];
      return {
        ...pick(item, ["_id", "name", "name_en", "category", "description", "description_en", "rental_price", "images"]),
        variants: variants.map((variant) => {
          if (!isRecord(variant)) return {};
          const stock = typeof variant.stock === "number" ? variant.stock : 0;
          const inMaintenance = variant.in_maintenance === true;
          return {
            ...pick(variant, ["size", "price_override"]),
            available: stock > 0 && !inMaintenance,
          };
        }),
      };
    }),
    ...(data.pagination !== undefined ? { pagination: data.pagination } : {}),
  };
}

function redactPublicAvailability(data: JsonValue): JsonValue {
  if (!isRecord(data)) return { booked: [] };
  const booked = Array.isArray(data.booked)
    ? data.booked.filter((date): date is string => typeof date === "string")
    : [];
  return { booked };
}

function redactUserAudit(data: JsonValue): JsonValue {
  if (!isRecord(data)) return data;
  const audit = isRecord(data.audit) ? data.audit : data;
  return {
    audit: redactValue(omit(audit, ["lastRental"])),
  };
}

function redactRentals(data: JsonValue): JsonValue {
  if (!isRecord(data)) return data;
  const items = Array.isArray(data.data) ? data.data : [];
  return {
    ...data,
    data: items.map((item) => isRecord(item)
      ? redactValue(omit(item, ["terms", "stripe_session_id", "stripe_payment_intent_id"]))
      : item),
  };
}

function redactAudit(data: JsonValue): JsonValue {
  return redactValue(data);
}

function redactObservability(data: JsonValue): JsonValue {
  return redactValue(data);
}

function createReportSummary(data: JsonValue): JsonValue {
  if (!isRecord(data)) return { summary: "No se encontraron datos para el reporte." };
  const stats = Array.isArray(data.stats) ? data.stats : [];
  const totalRentals = stats.reduce<number>((total, item) => {
    if (!isRecord(item) || typeof item.rentalsCount !== "number") return total;
    return total + item.rentalsCount;
  }, 0);
  const totalRevenue = stats.reduce<number>((total, item) => {
    if (!isRecord(item) || typeof item.totalRevenue !== "number") return total;
    return total + item.totalRevenue;
  }, 0);
  return {
    summary: `El reporte contiene ${stats.length} variantes, ${totalRentals} alquileres y ${totalRevenue.toFixed(2)} PAB de ingresos acumulados.`,
    variants: stats.length,
    rentalsCount: totalRentals,
    totalRevenue,
  };
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(record: { [key: string]: JsonValue }, keys: string[]): { [key: string]: JsonValue } {
  const result: { [key: string]: JsonValue } = {};
  for (const key of keys) {
    if (record[key] !== undefined) result[key] = record[key];
  }
  return result;
}

function omit(record: { [key: string]: JsonValue }, keys: string[]): JsonValue {
  const result: { [key: string]: JsonValue } = { ...record };
  for (const key of keys) delete result[key];
  return result;
}

function redactValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!isRecord(value)) return value;

  const result: { [key: string]: JsonValue } = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSensitiveKey(key)) continue;
    result[key] = redactValue(nestedValue);
  }
  return result;
}

function isSensitiveKey(key: string): boolean {
  return /(ip_address|user_agent|token|secret|authorization|api.?key|signature|card|cvc|clerkid|preferredaddress|stack)/i.test(key);
}
