import { describe, expect, it } from "bun:test";
import { handleMcpHttpRequest } from "./http.js";
import { loadMcpAuthConfig } from "./auth.js";

const config = loadMcpAuthConfig({
  MCP_ADMIN_API_KEY: "admin-secret-key",
  MCP_RESOURCE_URL: "https://mcp.example.com/mcp",
  MCP_OAUTH_ISSUER: "https://clerk.example.com",
});

const oauthConfig = loadMcpAuthConfig({
  MCP_OAUTH_ENABLED: "true",
  CLERK_SECRET_KEY: "clerk-secret-placeholder",
  MCP_OAUTH_ISSUER: "https://mcp.example.com",
  MCP_OAUTH_AUDIENCE: "https://mcp.example.com/mcp",
  MCP_RESOURCE_URL: "https://mcp.example.com/mcp",
  MCP_BACKEND_MCP_TOKEN: "bridge-token-placeholder",
  MCP_IDENTITY_PRIVATE_KEY: "private-key-placeholder",
  MCP_CLERK_OAUTH_ISSUER: "https://clerk.example.com",
  MCP_CLERK_OAUTH_CLIENT_ID: "clerk-client-placeholder",
  MCP_CLERK_OAUTH_CLIENT_SECRET: "clerk-client-secret-placeholder",
  MCP_CLERK_OAUTH_REDIRECT_URI: "https://mcp.example.com/oauth/clerk/callback",
  MCP_OAUTH_SIGNING_PRIVATE_KEY: "private-key-placeholder",
  MCP_OAUTH_SIGNING_PUBLIC_KEY: "public-key-placeholder",
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
      "catalog_products_search",
      "catalog_availability_check",
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
        params: { name: "admin_dashboard_summary", arguments: {} },
      }),
    }), config);

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp"',
    );
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
    expect(payload.scopes_supported).toContain("catalog.read");
    expect(payload.scopes_supported).toContain("payments.reconcile");
    expect(JSON.stringify(payload)).not.toContain("admin-secret-key");
  });

  it("publica metadata del authorization server del bridge MCP", async () => {
    const response = await handleMcpHttpRequest(new Request("https://mcp.example.com/.well-known/oauth-authorization-server"), oauthConfig);

    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toMatchObject({
      issuer: "https://mcp.example.com",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
    expect(payload.scopes_supported).toContain("dashboard.read");
  });

  it("registra clientes públicos MCP con PKCE y redirect URI segura", async () => {
    const response = await handleMcpHttpRequest(new Request("https://mcp.example.com/oauth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "Cliente MCP de prueba",
        redirect_uris: ["http://127.0.0.1:4567/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "dashboard.read reservations.read",
      }),
    }), oauthConfig);

    expect(response.status).toBe(201);
    const payload = await response.json() as Record<string, unknown>;
    expect(typeof payload.client_id).toBe("string");
    expect(payload.token_endpoint_auth_method).toBe("none");
    expect(JSON.stringify(payload)).not.toContain("private-key-placeholder");
  });
});
