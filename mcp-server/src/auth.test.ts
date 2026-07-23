import { describe, expect, it } from "bun:test";
import {
  authenticateMcpRequest,
  hasMcpScope,
  isMcpOriginAllowed,
  loadMcpAuthConfig,
} from "./auth.js";

const environment = {
  MCP_ADMIN_API_KEY: "admin-secret-key",
  MCP_CLIENT_API_KEY: "client-secret-key",
  MCP_ALLOWED_ORIGIN: "https://app.example.com,http://localhost:5173",
};

describe("autenticación HTTP del MCP", () => {
  it("crea un principal guest limitado cuando no hay credenciales", async () => {
    const config = loadMcpAuthConfig(environment);
    const principal = await authenticateMcpRequest(new Request("http://localhost/mcp"), config);

    expect(principal?.kind).toBe("guest");
    expect(principal?.mode).toBe("guest");
    expect(hasMcpScope(principal ?? undefined, "catalog.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "availability.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "dashboard.read")).toBe(false);
    expect(hasMcpScope(principal ?? undefined, "rentals.create")).toBe(false);
  });

  it("nunca convierte MCP_AUTH_REQUIRED=false en administrador", async () => {
    const config = loadMcpAuthConfig({ ...environment, MCP_AUTH_REQUIRED: "false" });
    const principal = await authenticateMcpRequest(new Request("http://localhost/mcp"), config);

    expect(principal?.kind).toBe("guest");
    expect(hasMcpScope(principal ?? undefined, "users.roles.write")).toBe(false);
  });

  it("autentica una API key administrativa como identidad de servicio", async () => {
    const config = loadMcpAuthConfig(environment);
    const principal = await authenticateMcpRequest(
      new Request("http://localhost/mcp", { headers: { Authorization: "Bearer admin-secret-key" } }),
      config,
    );

    expect(principal?.kind).toBe("service");
    expect(principal?.mode).toBe("admin");
    expect(principal?.serviceName).toBe("admin");
    expect(hasMcpScope(principal ?? undefined, "dashboard.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "users.roles.write")).toBe(true);
  });

  it("limita una API key de cliente a scopes propios", async () => {
    const config = loadMcpAuthConfig(environment);
    const principal = await authenticateMcpRequest(
      new Request("http://localhost/mcp", { headers: { Authorization: "Bearer client-secret-key" } }),
      config,
    );

    expect(principal?.kind).toBe("service");
    expect(principal?.mode).toBe("client");
    expect(hasMcpScope(principal ?? undefined, "catalog.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "rentals.create")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "dashboard.read")).toBe(false);
  });

  it("deriva scopes MCP del rol real recibido desde Clerk", async () => {
    const config = loadMcpAuthConfig({
      ...environment,
      MCP_OAUTH_ENABLED: "true",
      CLERK_SECRET_KEY: "clerk-secret-placeholder",
      MCP_OAUTH_ISSUER: "https://clerk.example.com",
      MCP_RESOURCE_URL: "https://mcp.example.com/mcp",
      MCP_BACKEND_MCP_TOKEN: "bridge-token-placeholder",
      MCP_IDENTITY_PRIVATE_KEY: "private-key-placeholder",
    });
    const principal = await authenticateMcpRequest(
      new Request("https://mcp.example.com/mcp", { headers: { Authorization: "Bearer oauth-token" } }),
      config,
      async () => ({ userId: "user_operator", clientId: "mcp-client", scopes: ["openid"] }),
      async () => "operator",
    );

    expect(principal?.kind).toBe("oauth");
    expect(principal?.clerkUserId).toBe("user_operator");
    expect(principal?.role).toBe("operator");
    expect(hasMcpScope(principal ?? undefined, "reservations.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "products.write")).toBe(false);
  });

  it("rechaza credenciales ausentes cuando guest está deshabilitado e inválidas siempre", async () => {
    const config = loadMcpAuthConfig({ ...environment, MCP_GUEST_ENABLED: "false" });
    expect(await authenticateMcpRequest(new Request("http://localhost/mcp"), config)).toBeNull();
    expect(await authenticateMcpRequest(
      new Request("http://localhost/mcp", { headers: { Authorization: "Bearer wrong-key" } }),
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
