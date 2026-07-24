import { describe, expect, it } from "bun:test";
import { exportPKCS8, exportSPKI, generateKeyPair, SignJWT } from "jose";
import {
  authenticateMcpRequest,
  hasMcpScope,
  isMcpOriginAllowed,
  loadMcpAuthConfig,
  MCP_ROLE_SCOPES,
  MCP_SCOPES,
} from "./auth.js";

const environment = {
  MCP_ADMIN_API_KEY: "admin-secret-key",
  MCP_CLIENT_API_KEY: "client-secret-key",
  MCP_ALLOWED_ORIGIN: "https://app.example.com,http://localhost:5173",
};

describe("autenticación HTTP del MCP", () => {
  it("alinea los scopes MCP con los cinco roles de negocio", () => {
    expect(MCP_ROLE_SCOPES.client).toEqual(new Set([
      "catalog.read",
      "availability.read",
      "rentals.create",
      "rentals.read.own",
      "rentals.cancel.own",
      "payments.create",
    ]));
    expect(MCP_ROLE_SCOPES.owner.size).toBe(MCP_SCOPES.length);
    expect(MCP_ROLE_SCOPES.owner).toEqual(new Set(MCP_SCOPES));

    expect(MCP_ROLE_SCOPES.operator.has("dashboard.read")).toBe(true);
    expect(MCP_ROLE_SCOPES.operator.has("reservations.write")).toBe(true);
    expect(MCP_ROLE_SCOPES.operator.has("products.write")).toBe(false);
    expect(MCP_ROLE_SCOPES.operator.has("users.roles.write")).toBe(false);
    expect(MCP_ROLE_SCOPES.operator.has("payments.reconcile")).toBe(false);

    expect(MCP_ROLE_SCOPES.inventory.has("inventory.write")).toBe(true);
    expect(MCP_ROLE_SCOPES.inventory.has("products.write")).toBe(true);
    expect(MCP_ROLE_SCOPES.inventory.has("users.roles.write")).toBe(false);
    expect(MCP_ROLE_SCOPES.inventory.has("payments.reconcile")).toBe(false);

    expect(MCP_ROLE_SCOPES.support.has("reservations.read")).toBe(true);
    expect(MCP_ROLE_SCOPES.support.has("users.read")).toBe(true);
    expect(MCP_ROLE_SCOPES.support.has("products.write")).toBe(false);
    expect(MCP_ROLE_SCOPES.support.has("payments.reconcile")).toBe(false);
  });

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
      MCP_CLERK_OAUTH_ISSUER: "https://clerk.example.com",
      MCP_CLERK_OAUTH_CLIENT_ID: "clerk-client-placeholder",
      MCP_CLERK_OAUTH_CLIENT_SECRET: "clerk-client-secret-placeholder",
      MCP_CLERK_OAUTH_REDIRECT_URI: "https://mcp.example.com/oauth/clerk/callback",
      MCP_OAUTH_SIGNING_PRIVATE_KEY: "private-key-placeholder",
      MCP_OAUTH_SIGNING_PUBLIC_KEY: "public-key-placeholder",
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

  it("valida un access token MCP firmado y conserva solamente los scopes pedidos", async () => {
    const { privateKey, publicKey } = await generateKeyPair("EdDSA", { extractable: true });
    const config = loadMcpAuthConfig({
      ...environment,
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
      MCP_OAUTH_SIGNING_PRIVATE_KEY: await exportPKCS8(privateKey),
      MCP_OAUTH_SIGNING_PUBLIC_KEY: await exportSPKI(publicKey),
    });
    const token = await new SignJWT({
      token_use: "mcp_access",
      client_id: "mcp-test-client",
      role: "operator",
      scope: "dashboard.read reservations.read",
    })
      .setProtectedHeader({ alg: "EdDSA", typ: "at+jwt" })
      .setIssuer("https://mcp.example.com")
      .setAudience("https://mcp.example.com/mcp")
      .setSubject("user_operator")
      .setIssuedAt()
      .setExpirationTime("5m")
      .setJti("jti-operator-test")
      .sign(privateKey);

    const principal = await authenticateMcpRequest(new Request("https://mcp.example.com/mcp", {
      headers: { Authorization: `Bearer ${token}` },
    }), config);

    expect(principal?.role).toBe("operator");
    expect(hasMcpScope(principal ?? undefined, "dashboard.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "reservations.read")).toBe(true);
    expect(hasMcpScope(principal ?? undefined, "products.write")).toBe(false);
  });

  it("rechaza un access token que intenta elevar scopes fuera del rol", async () => {
    const { privateKey, publicKey } = await generateKeyPair("EdDSA", { extractable: true });
    const config = loadMcpAuthConfig({
      ...environment,
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
      MCP_OAUTH_SIGNING_PRIVATE_KEY: await exportPKCS8(privateKey),
      MCP_OAUTH_SIGNING_PUBLIC_KEY: await exportSPKI(publicKey),
    });
    const token = await new SignJWT({
      token_use: "mcp_access",
      client_id: "mcp-test-client",
      role: "support",
      scope: "users.roles.write",
    })
      .setProtectedHeader({ alg: "EdDSA", typ: "at+jwt" })
      .setIssuer("https://mcp.example.com")
      .setAudience("https://mcp.example.com/mcp")
      .setSubject("user_support")
      .setIssuedAt()
      .setExpirationTime("5m")
      .setJti("jti-support-test")
      .sign(privateKey);

    await expect(authenticateMcpRequest(new Request("https://mcp.example.com/mcp", {
      headers: { Authorization: `Bearer ${token}` },
    }), config)).resolves.toBeNull();
  });
});
