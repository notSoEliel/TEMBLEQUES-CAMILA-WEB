import { describe, expect, it } from "bun:test";
import {
  authenticateMcpRequest,
  hasMcpScope,
  isMcpOriginAllowed,
  loadMcpAuthConfig,
} from "./auth.js";

const environment = {
  MCP_AUTH_REQUIRED: "true",
  MCP_ADMIN_API_KEY: "admin-secret-key",
  MCP_CLIENT_API_KEY: "client-secret-key",
  MCP_ALLOWED_ORIGIN: "https://app.example.com,http://localhost:5173",
};

describe("autenticación HTTP del MCP", () => {
  it("falla al cargar configuración requerida sin keys", () => {
    expect(() => loadMcpAuthConfig({ MCP_AUTH_REQUIRED: "true" })).toThrow(
      "MCP_AUTH_REQUIRED=true necesita",
    );
  });

  it("autentica una key administrativa y aplica sus scopes", () => {
    const config = loadMcpAuthConfig(environment);
    const principal = authenticateMcpRequest(
      new Request("http://localhost/mcp", {
        headers: { Authorization: "Bearer admin-secret-key" },
      }),
      config,
    );

    expect(principal?.mode).toBe("admin");
    expect(hasMcpScope(principal ?? undefined, "dashboard.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "users.roles.write")).toBe(true);
  });

  it("limita una key de cliente a sus scopes", () => {
    const config = loadMcpAuthConfig(environment);
    const principal = authenticateMcpRequest(
      new Request("http://localhost/mcp", {
        headers: { Authorization: "Bearer client-secret-key" },
      }),
      config,
    );

    expect(principal?.mode).toBe("client");
    expect(hasMcpScope(principal ?? undefined, "catalog.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "dashboard.read")).toBe(false);
  });

  it("rechaza credenciales ausentes o inválidas", () => {
    const config = loadMcpAuthConfig(environment);
    expect(authenticateMcpRequest(new Request("http://localhost/mcp"), config)).toBeNull();
    expect(authenticateMcpRequest(
      new Request("http://localhost/mcp", {
        headers: { Authorization: "Bearer wrong-key" },
      }),
      config,
    )).toBeNull();
  });

  it("permite únicamente orígenes configurados", () => {
    const config = loadMcpAuthConfig(environment);
    expect(isMcpOriginAllowed(
      new Request("http://localhost/mcp", { headers: { Origin: "https://app.example.com" } }),
      config.allowedOrigins,
    )).toBe(true);
    expect(isMcpOriginAllowed(
      new Request("http://localhost/mcp", { headers: { Origin: "https://evil.example.com" } }),
      config.allowedOrigins,
    )).toBe(false);
  });
});
