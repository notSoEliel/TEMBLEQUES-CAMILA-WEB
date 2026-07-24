import { describe, expect, it } from "bun:test";
import { exportPKCS8, exportSPKI, exportJWK, generateKeyPair, SignJWT } from "jose";
import { authenticateMcpRequest, loadMcpAuthConfig } from "./auth.js";
import { McpOAuthService } from "./oauth.js";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringField(value: unknown, field: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Falta ${field}.`);
  const result = (value as Record<string, unknown>)[field];
  if (typeof result !== "string") throw new Error(`Falta ${field}.`);
  return result;
}

describe("bridge OAuth MCP", () => {
  it("completa Authorization Code + PKCE, rota refresh y revoca access tokens", async () => {
    const { privateKey: mcpPrivateKey, publicKey: mcpPublicKey } = await generateKeyPair("EdDSA", { extractable: true });
    const { privateKey: clerkPrivateKey, publicKey: clerkPublicKey } = await generateKeyPair("RS256", { extractable: true });
    const clerkJwk = await exportJWK(clerkPublicKey);
    const config = loadMcpAuthConfig({
      MCP_OAUTH_ENABLED: "true",
      CLERK_SECRET_KEY: "clerk-secret-placeholder",
      MCP_OAUTH_ISSUER: "https://mcp.example.com",
      MCP_OAUTH_AUDIENCE: "https://mcp.example.com/mcp",
      MCP_RESOURCE_URL: "https://mcp.example.com/mcp",
      MCP_BACKEND_MCP_TOKEN: "bridge-token-placeholder",
      MCP_IDENTITY_PRIVATE_KEY: "private-key-placeholder",
      MCP_CLERK_OAUTH_ISSUER: "https://clerk.example.com",
      MCP_CLERK_OAUTH_CLIENT_ID: "clerk-client-id",
      MCP_CLERK_OAUTH_CLIENT_SECRET: "clerk-client-secret",
      MCP_CLERK_OAUTH_REDIRECT_URI: "https://mcp.example.com/oauth/clerk/callback",
      MCP_OAUTH_SIGNING_PRIVATE_KEY: await exportPKCS8(mcpPrivateKey),
      MCP_OAUTH_SIGNING_PUBLIC_KEY: await exportSPKI(mcpPublicKey),
    });
    const service = new McpOAuthService(config, { resolveRole: async () => "operator" });
    const originalFetch = globalThis.fetch;
    let clerkIdToken = "";

    const fakeFetch = Object.assign(
      async (input: RequestInfo | URL): Promise<Response> => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
        if (url.pathname === "/.well-known/jwks.json") return jsonResponse({ keys: [clerkJwk] });
        if (url.pathname === "/oauth/token") return jsonResponse({ access_token: "clerk-upstream-access", id_token: clerkIdToken });
        if (url.pathname === "/oauth/userinfo") return jsonResponse({ sub: "user_operator" });
        return jsonResponse({ error: "not_found" }, 404);
      },
      { preconnect: (_url: string | URL, _options?: { dns?: boolean; tcp?: boolean; http?: boolean; https?: boolean }) => undefined },
    );
    globalThis.fetch = fakeFetch;

    try {
      const registration = await service.register(new Request("https://mcp.example.com/oauth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "Codex test",
          redirect_uris: ["http://127.0.0.1:4567/callback"],
          scope: "dashboard.read reservations.read",
        }),
      }));
      const clientId = stringField(await registration.json(), "client_id");
      const verifier = "mcp-test-pkce-verifier-abcdefghijklmnopqrstuvwxyz";
      const challenge = await pkceChallenge(verifier);
      const authorizeUrl = new URL("https://mcp.example.com/oauth/authorize");
      authorizeUrl.search = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: "http://127.0.0.1:4567/callback",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "dashboard.read reservations.read",
        resource: "https://mcp.example.com/mcp",
        state: "state-from-client",
      }).toString();
      const clerkRedirect = await service.authorize(new Request(authorizeUrl));
      const upstreamUrl = new URL(clerkRedirect.headers.get("location") ?? "");
      expect(upstreamUrl.searchParams.get("prompt")).toBe("select_account");
      clerkIdToken = await new SignJWT({ nonce: upstreamUrl.searchParams.get("nonce") })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuer("https://clerk.example.com")
        .setAudience("clerk-client-id")
        .setSubject("user_operator")
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(clerkPrivateKey);
      const callbackUrl = new URL("https://mcp.example.com/oauth/clerk/callback");
      callbackUrl.search = new URLSearchParams({ code: "clerk-code", state: upstreamUrl.searchParams.get("state") ?? "" }).toString();
      const clientRedirect = await service.clerkCallback(new Request(callbackUrl));
      const bridgeCode = new URL(clientRedirect.headers.get("location") ?? "").searchParams.get("code");
      expect(bridgeCode).toBeTruthy();

      const tokenResponse = await service.token(new Request("https://mcp.example.com/oauth/token", {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code: bridgeCode ?? "",
          redirect_uri: "http://127.0.0.1:4567/callback",
          code_verifier: verifier,
        }),
      }));
      expect(tokenResponse.status).toBe(200);
      const tokens = await tokenResponse.json() as Record<string, unknown>;
      const accessToken = stringField(tokens, "access_token");
      const refreshToken = stringField(tokens, "refresh_token");
      expect(tokens.scope).toBe("dashboard.read reservations.read");

      const principal = await authenticateMcpRequest(new Request("https://mcp.example.com/mcp", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }), config);
      expect(principal?.role).toBe("operator");
      expect(principal?.scopes.has("dashboard.read")).toBe(true);
      expect(principal?.scopes.has("products.write")).toBe(false);

      const refreshed = await service.token(new Request("https://mcp.example.com/oauth/token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken }),
      }));
      expect(refreshed.status).toBe(200);
      const refreshedTokens = await refreshed.json() as Record<string, unknown>;
      expect(stringField(refreshedTokens, "access_token")).not.toBe(accessToken);
      expect(stringField(refreshedTokens, "refresh_token")).not.toBe(refreshToken);

      const revoked = await service.revoke(new Request("https://mcp.example.com/oauth/revoke", {
        method: "POST",
        body: new URLSearchParams({ token: accessToken, client_id: clientId }),
      }));
      expect(revoked.status).toBe(200);
      await expect(authenticateMcpRequest(new Request("https://mcp.example.com/mcp", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }), config)).resolves.toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
