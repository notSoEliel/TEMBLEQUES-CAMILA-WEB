import { describe, expect, it } from "bun:test";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTemblequesMcpServer } from "./server.js";
import type { McpPrincipal } from "./auth.js";

type JsonRpcResponse = {
  result?: { tools?: Array<{ name: string }> };
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
});
