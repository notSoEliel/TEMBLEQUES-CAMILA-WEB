import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type AuthMode = "public" | "client" | "admin";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ApiResult = {
  ok: boolean;
  status: number;
  data: JsonValue;
};

const backendUrl = (process.env.MCP_BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const adminToken = process.env.MCP_ADMIN_TOKEN;
const clientToken = process.env.MCP_CLIENT_TOKEN;

function tokenFor(mode: AuthMode): string | undefined {
  if (mode === "admin") return adminToken;
  if (mode === "client") return clientToken;
  return undefined;
}

function ensureToken(mode: AuthMode): void {
  if (mode !== "public" && !tokenFor(mode)) {
    throw new Error(`La tool requiere MCP_${mode.toUpperCase()}_TOKEN.`);
  }
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const value = query.toString();
  return value ? `?${value}` : "";
}

async function api(
  path: string,
  mode: AuthMode = "public",
  init: RequestInit = {},
): Promise<ApiResult> {
  ensureToken(mode);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = tokenFor(mode);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${backendUrl}${path}`, { ...init, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json() as JsonValue
    : { text: await response.text() };

  return { ok: response.ok, status: response.status, data };
}

function response(result: JsonValue) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

export function createTemblequesMcpServer(): McpServer {
const server = new McpServer({
  name: "tembleques-camila",
  version: "1.0.0",
});

server.registerTool(
  "admin.dashboard.summary",
  {
    title: "Resumen administrativo",
    description: "Consulta KPIs del dashboard administrativo.",
    inputSchema: {},
  },
  async () => response(await api("/api/admin/dashboard", "admin")),
);

server.registerTool(
  "catalog.products.search",
  {
    title: "Buscar productos",
    description: "Busca productos del catalogo por texto, categoria, talla, precio y fechas.",
    inputSchema: {
      search: z.string().optional(),
      category: z.string().optional(),
      size: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(10),
    },
  },
  async (input) => response(await api(`/api/products${toQuery(input)}`)),
);

server.registerTool(
  "catalog.availability.check",
  {
    title: "Consultar disponibilidad",
    description: "Consulta fechas reservadas o bloqueadas de un producto.",
    inputSchema: {
      productId: z.string(),
      from: z.string().optional(),
      to: z.string().optional(),
    },
  },
  async ({ productId, from, to }) => response(await api(`/api/products/${productId}/availability${toQuery({ from, to })}`)),
);

server.registerTool(
  "rentals.draft.create",
  {
    title: "Crear reserva pendiente",
    description: "Crea una reserva pendiente para el cliente autenticado.",
    inputSchema: {
      productId: z.string(),
      selectedSize: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      paymentType: z.enum(["reservation", "full"]).default("reservation"),
      orderGroupId: z.string().optional(),
    },
  },
  async (input) => response(await api("/api/rentals", "client", {
    method: "POST",
    body: JSON.stringify({ ...input, termsAccepted: true }),
  })),
);

server.registerTool(
  "payments.checkout.create",
  {
    title: "Crear checkout",
    description: "Crea una sesion de checkout para reservas pendientes.",
    inputSchema: {
      rentalId: z.string().optional(),
      rentalIds: z.array(z.string()).optional(),
      orderGroupId: z.string().optional(),
      paymentType: z.enum(["reservation", "full"]).optional(),
      couponCode: z.string().optional(),
    },
  },
  async (input) => response(await api("/api/stripe/create-checkout-session", "client", {
    method: "POST",
    body: JSON.stringify(input),
  })),
);

server.registerTool(
  "rentals.mine.list",
  {
    title: "Listar mis reservas",
    description: "Lista reservas del cliente autenticado.",
    inputSchema: {
      view: z.enum(["active", "cancelled"]).default("active"),
      page: z.number().default(1),
      limit: z.number().default(10),
    },
  },
  async (input) => response(await api(`/api/rentals/my${toQuery(input)}`, "client")),
);

server.registerTool(
  "rentals.pending.cancel",
  {
    title: "Cancelar reserva pendiente",
    description: "Cancela una reserva pendiente del cliente autenticado.",
    inputSchema: { rentalId: z.string() },
  },
  async ({ rentalId }) => response(await api(`/api/rentals/${rentalId}`, "client", { method: "DELETE" })),
);

server.registerTool(
  "admin.rentals.list",
  {
    title: "Listar reservas admin",
    description: "Lista reservas administrativas con filtros basicos.",
    inputSchema: {
      status: z.string().optional(),
      sort: z.enum(["asc", "desc"]).default("desc"),
      page: z.number().default(1),
      limit: z.number().default(10),
    },
  },
  async (input) => response(await api(`/api/admin/rentals${toQuery(input)}`, "admin")),
);

server.registerTool(
  "admin.rentals.status.update",
  {
    title: "Actualizar estado de reserva",
    description: "Actualiza el estado operativo de una reserva.",
    inputSchema: { rentalId: z.string(), status: z.string() },
  },
  async ({ rentalId, status }) => response(await api(`/api/admin/rentals/${rentalId}/status`, "admin", {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })),
);

server.registerTool(
  "admin.calendar.range",
  {
    title: "Consultar calendario admin",
    description: "Consulta eventos de reservas por rango de fechas.",
    inputSchema: { from: z.string(), to: z.string() },
  },
  async (input) => response(await api(`/api/admin/rentals/calendar${toQuery(input)}`, "admin")),
);

server.registerTool(
  "admin.products.upsert",
  {
    title: "Crear o editar producto",
    description: "Crea o edita productos usando las validaciones del backend.",
    inputSchema: {
      productId: z.string().optional(),
      product: z.record(z.unknown()),
    },
  },
  async ({ productId, product }) => response(await api(
    productId ? `/api/admin/products/${productId}` : "/api/admin/products",
    "admin",
    { method: productId ? "PUT" : "POST", body: JSON.stringify(product) },
  )),
);

server.registerTool(
  "admin.inventory.variantMaintenance.set",
  {
    title: "Crear bloqueo de mantenimiento",
    description: "Crea un bloqueo temporal de mantenimiento para producto y talla.",
    inputSchema: {
      productId: z.string(),
      selectedSize: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      reason: z.string().optional(),
    },
  },
  async (input) => response(await api("/api/admin/maintenance", "admin", {
    method: "POST",
    body: JSON.stringify(input),
  })),
);

server.registerTool(
  "admin.users.search",
  {
    title: "Buscar clientes",
    description: "Lista clientes paginados para busqueda administrativa.",
    inputSchema: { page: z.number().default(1), limit: z.number().default(10) },
  },
  async (input) => response(await api(`/api/admin/users${toQuery(input)}`, "admin")),
);

server.registerTool(
  "admin.users.detail",
  {
    title: "Detalle de cliente",
    description: "Consulta perfil, estadisticas, auditoria e historial paginado de un cliente.",
    inputSchema: {
      userId: z.string(),
      page: z.number().default(1),
      limit: z.number().default(10),
    },
  },
  async ({ userId, page, limit }) => {
    const [user, stats, audit, rentals] = await Promise.all([
      api(`/api/admin/users/${userId}`, "admin"),
      api(`/api/admin/users/${userId}/stats`, "admin"),
      api(`/api/admin/users/${userId}/audit`, "admin"),
      api(`/api/admin/users/${userId}/rentals${toQuery({ page, limit })}`, "admin"),
    ]);
    return response({ user, stats, audit, rentals });
  },
);

server.registerTool(
  "reports.operations.generate",
  {
    title: "Generar reporte operativo",
    description: "Genera estadisticas de inventario y rotacion comercial.",
    inputSchema: {},
  },
  async () => response(await api("/api/admin/reports/inventory-stats", "admin")),
);

server.registerTool(
  "security.audit.search",
  {
    title: "Consultar auditoria",
    description: "Consulta auditoria disponible por cliente. La auditoria global queda en backlog.",
    inputSchema: { userId: z.string() },
  },
  async ({ userId }) => response(await api(`/api/admin/users/${userId}/audit`, "admin")),
);

server.registerTool(
  "ops.health.check",
  {
    title: "Salud tecnica",
    description: "Verifica salud del backend y dependencias configuradas.",
    inputSchema: {},
  },
  async () => response({
    backend: await api("/health"),
    config: {
      backendUrl,
      adminTokenConfigured: Boolean(adminToken),
      clientTokenConfigured: Boolean(clientToken),
    },
  }),
);

server.registerTool(
  "payments.reconcile.run",
  {
    title: "Conciliacion de pagos",
    description: "Lista reservas administrativas para detectar estados de pago inconsistentes.",
    inputSchema: { page: z.number().default(1), limit: z.number().default(50) },
  },
  async (input) => response(await api(`/api/admin/rentals${toQuery(input)}`, "admin")),
);

return server;
}
