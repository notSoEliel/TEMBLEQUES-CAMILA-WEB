import { describe, expect, it } from "bun:test";
import { handleMcpHttpRequest } from "./http.js";
import { loadMcpAuthConfig } from "./auth.js";

const config = loadMcpAuthConfig({
  MCP_ADMIN_API_KEY: "admin-secret-key",
  MCP_RESOURCE_URL: "https://mcp.example.com/mcp",
  MCP_OAUTH_ISSUER: "https://clerk.example.com",
});

async function responsePayload(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const line = raw.split("\n").find((value) => value.startsWith("data:"));
    if (!line) throw new Error("La respuesta no contiene data.");
    return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

describe("transporte HTTP MCP", () => {
  it("permite tools/list guest y solo devuelve las dos tools públicas", async () => {
    const response = await handleMcpHttpRequest(new Request("https://mcp.example.com/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    }), config);

    expect(response.status).toBe(200);
    const payload = await responsePayload(response);
    const result = payload.result as { tools: Array<{ name: string }> };
    expect(result.tools.map((tool) => tool.name)).toEqual([
      "catalog.products.search",
      "catalog.availability.check",
    ]);
  });

  it("devuelve 401 y challenge OAuth para una tool protegida guest", async () => {
    const response = await handleMcpHttpRequest(new Request("https://mcp.example.com/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "admin.dashboard.summary", arguments: {} },
      }),
    }), config);

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("oauth-protected-resource/mcp");
    const payload = await responsePayload(response);
    expect(payload).toMatchObject({ code: "MCP_OAUTH_REQUIRED" });
  });

  it("publica metadata OAuth sin secretos", async () => {
    const response = await handleMcpHttpRequest(new Request("https://mcp.example.com/.well-known/oauth-protected-resource/mcp"), config);

    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toMatchObject({
      resource: "https://mcp.example.com/mcp",
      authorization_servers: ["https://clerk.example.com"],
      bearer_methods_supported: ["header"],
    });
    expect(JSON.stringify(payload)).not.toContain("admin-secret-key");
  });
});
