import { describe, expect, it } from "bun:test";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTemblequesMcpServer } from "./server.js";
import { MCP_ROLE_SCOPES, type McpPrincipal, type McpRole } from "./auth.js";

type JsonRpcResponse = {
  result?: {
    tools?: Array<{ name: string }>;
    isError?: boolean;
    content?: Array<{ type: string; text?: string }>;
  };
  error?: { code?: number; message?: string };
};

async function requestPayload(
  transport: WebStandardStreamableHTTPServerTransport,
  body: Record<string, unknown>,
  sessionId?: string,
): Promise<{ response: Response; payload: JsonRpcResponse }> {
  const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json, text/event-stream" });
  if (sessionId) headers.set("mcp-session-id", sessionId);
  const response = await transport.handleRequest(new Request("http://localhost/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }));
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  if (contentType.includes("text/event-stream")) {
    const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) throw new Error("La respuesta MCP no contiene data.");
    return { response, payload: JSON.parse(dataLine.slice(5).trim()) as JsonRpcResponse };
  }
  return { response, payload: JSON.parse(raw) as JsonRpcResponse };
}

async function listedTools(principal: McpPrincipal): Promise<string[]> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
  });
  const server = createTemblequesMcpServer(principal);
  await server.connect(transport);
  const initialized = await requestPayload(transport, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    },
  });
  const sessionId = initialized.response.headers.get("mcp-session-id") ?? undefined;
  const listed = await requestPayload(transport, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  }, sessionId);
  await server.close();
  return listed.payload.result?.tools?.map((tool) => tool.name) ?? [];
}

async function calledTool(
  principal: McpPrincipal,
  name: string,
  argumentsValue: Record<string, unknown> = {},
): Promise<JsonRpcResponse> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
  });
  const server = createTemblequesMcpServer(principal);
  await server.connect(transport);
  const initialized = await requestPayload(transport, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    },
  });
  const sessionId = initialized.response.headers.get("mcp-session-id") ?? undefined;
  const called = await requestPayload(transport, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name, arguments: argumentsValue },
  }, sessionId);
  await server.close();
  return called.payload;
}

const guest: McpPrincipal = {
  id: "mcp-guest",
  kind: "guest",
  mode: "guest",
  scopes: new Set(["catalog.read", "availability.read"]),
};

const operator: McpPrincipal = {
  id: "clerk:user_operator",
  kind: "oauth",
  mode: "admin",
  role: "operator",
  clerkUserId: "user_operator",
  scopes: new Set([
    "catalog.read",
    "availability.read",
    "dashboard.read",
    "reservations.read",
    "reservations.write",
    "users.read",
    "reports.read",
    "observability.read",
    "products.read",
    "contacts.manage",
    "coupons.manage",
    "incidents.read",
    "incidents.write",
  ]),
};

function rolePrincipal(role: McpRole): McpPrincipal {
  return {
    id: `clerk:user_${role}`,
    kind: "oauth",
    mode: role === "client" ? "client" : "admin",
    role,
    clerkUserId: `user_${role}`,
    scopes: MCP_ROLE_SCOPES[role],
  };
}

const expectedToolsByRole: Readonly<Record<McpRole, readonly string[]>> = {
  client: [
    "catalog.products.search",
    "catalog.availability.check",
    "rentals.draft.create",
    "payments.checkout.create",
    "rentals.mine.list",
    "rentals.pending.cancel",
  ],
  owner: [
    "admin.dashboard.summary",
    "catalog.products.search",
    "catalog.availability.check",
    "rentals.draft.create",
    "payments.checkout.create",
    "rentals.mine.list",
    "rentals.pending.cancel",
    "admin.rentals.list",
    "admin.rentals.status.update",
    "admin.calendar.range",
    "admin.products.upsert",
    "admin.inventory.variantMaintenance.set",
    "admin.users.search",
    "admin.users.detail",
    "reports.operations.generate",
    "security.audit.search",
    "ops.health.check",
    "payments.reconcile.run",
  ],
  operator: [
    "admin.dashboard.summary",
    "admin.rentals.list",
    "admin.rentals.status.update",
    "admin.calendar.range",
    "admin.users.search",
    "admin.users.detail",
    "reports.operations.generate",
    "ops.health.check",
  ],
  inventory: [
    "admin.dashboard.summary",
    "admin.rentals.list",
    "admin.calendar.range",
    "admin.products.upsert",
    "admin.inventory.variantMaintenance.set",
  ],
  support: [
    "admin.dashboard.summary",
    "admin.rentals.list",
    "admin.calendar.range",
    "admin.users.search",
    "admin.users.detail",
  ],
};

type StoryRoleAccess = {
  story: string;
  issue: number;
  tool: string;
  allowedRoles: readonly McpRole[];
  deniedRoles: readonly McpRole[];
};

/**
 * Matriz ejecutable de las historias MCP administrativas pendientes.
 *
 * Las aserciones de esta matriz prueban autorización y descubrimiento de
 * tools. La validación de efectos reales se realiza en el smoke de staging,
 * con API keys de servicio y OAuth cuando existe una sesión humana válida.
 */
const pendingStoryRoleMatrix: readonly StoryRoleAccess[] = [
  {
    story: "H91 - Cambiar estado de reserva",
    issue: 117,
    tool: "admin.rentals.status.update",
    allowedRoles: ["owner", "operator"],
    deniedRoles: ["client", "inventory", "support"],
  },
  {
    story: "H93 - Crear y editar productos",
    issue: 119,
    tool: "admin.products.upsert",
    allowedRoles: ["owner", "inventory"],
    deniedRoles: ["client", "operator", "support"],
  },
  {
    story: "H94 - Gestionar mantenimiento de variantes",
    issue: 120,
    tool: "admin.inventory.variantMaintenance.set",
    allowedRoles: ["owner", "inventory"],
    deniedRoles: ["client", "operator", "support"],
  },
  {
    story: "H95 - Buscar usuarios",
    issue: 121,
    tool: "admin.users.search",
    allowedRoles: ["owner", "operator", "support"],
    deniedRoles: ["client", "inventory"],
  },
  {
    story: "H96 - Consultar detalle de usuario",
    issue: 122,
    tool: "admin.users.detail",
    allowedRoles: ["owner", "operator", "support"],
    deniedRoles: ["client", "inventory"],
  },
  {
    story: "H97 - Generar reportes operativos",
    issue: 123,
    tool: "reports.operations.generate",
    allowedRoles: ["owner", "operator"],
    deniedRoles: ["client", "inventory", "support"],
  },
  {
    story: "H98 - Consultar auditoría global",
    issue: 124,
    tool: "security.audit.search",
    allowedRoles: ["owner"],
    deniedRoles: ["client", "operator", "inventory", "support"],
  },
  {
    story: "H99 - Consultar salud técnica",
    issue: 125,
    tool: "ops.health.check",
    allowedRoles: ["owner", "operator"],
    deniedRoles: ["client", "inventory", "support"],
  },
  {
    story: "H100 - Conciliar pagos",
    issue: 126,
    tool: "payments.reconcile.run",
    allowedRoles: ["owner"],
    deniedRoles: ["client", "operator", "inventory", "support"],
  },
];

describe("tools MCP visibles por principal", () => {
  it("guest solo descubre catálogo y disponibilidad", async () => {
    await expect(listedTools(guest)).resolves.toEqual([
      "catalog.products.search",
      "catalog.availability.check",
    ]);
  });

  it("operator no descubre tools de productos write ni auditoría global", async () => {
    const tools = await listedTools(operator);
    expect(tools).toContain("admin.rentals.list");
    expect(tools).toContain("admin.rentals.status.update");
    expect(tools).not.toContain("admin.products.upsert");
    expect(tools).not.toContain("security.audit.search");
    expect(tools).not.toContain("payments.reconcile.run");
  });

  it("expone exactamente las tools permitidas para cada rol real", async () => {
    for (const role of ["client", "owner", "operator", "inventory", "support"] as const) {
      await expect(listedTools(rolePrincipal(role))).resolves.toEqual(Array.from(expectedToolsByRole[role]));
    }
  });

  it("impide ejecutar una tool que el rol no puede descubrir", async () => {
    const checks: Array<{ principal: McpPrincipal; tool: string }> = [
      { principal: rolePrincipal("client"), tool: "admin.dashboard.summary" },
      { principal: rolePrincipal("operator"), tool: "admin.products.upsert" },
      { principal: rolePrincipal("inventory"), tool: "admin.users.search" },
      { principal: rolePrincipal("support"), tool: "payments.reconcile.run" },
      { principal: guest, tool: "rentals.draft.create" },
    ];

    for (const check of checks) {
      const result = await calledTool(check.principal, check.tool);
      expect(result.error ?? result.result?.isError).toBeTruthy();
    }
  });

  it("mantiene trazabilidad de acceso para cada historia administrativa pendiente", () => {
    for (const story of pendingStoryRoleMatrix) {
      expect(story.issue).toBeGreaterThan(0);
      for (const role of story.allowedRoles) {
        expect(expectedToolsByRole[role]).toContain(story.tool);
      }
      for (const role of story.deniedRoles) {
        expect(expectedToolsByRole[role]).not.toContain(story.tool);
      }
    }
  });

  it("rechaza cada tool administrativa pendiente para los roles no autorizados", async () => {
    for (const story of pendingStoryRoleMatrix) {
      for (const role of story.deniedRoles) {
        const result = await calledTool(rolePrincipal(role), story.tool);
        expect(result.error ?? result.result?.isError).toBeTruthy();
      }
    }
  });

  it("redacta datos sensibles de las respuestas públicas", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = Object.assign(
      async (): Promise<Response> => new Response(JSON.stringify({
        data: [{
          _id: "product-1",
          name: "Producto público",
          email: "cliente@example.com",
          ip_address: "192.0.2.10",
          variants: [{ size: "M", stock: 2, in_maintenance: false, token: "no-debe-salir" }],
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
      { preconnect: (_url: string | URL, _options?: { dns?: boolean; tcp?: boolean; http?: boolean; https?: boolean }) => undefined },
    );

    try {
      const result = await calledTool(rolePrincipal("client"), "catalog.products.search");
      const text = result.result?.content?.find((item) => item.type === "text")?.text ?? "";
      expect(text).toContain("Producto público");
      expect(text).toContain("available");
      expect(text).not.toContain("cliente@example.com");
      expect(text).not.toContain("192.0.2.10");
      expect(text).not.toContain("no-debe-salir");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
