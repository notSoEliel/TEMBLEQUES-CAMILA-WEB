import { importPKCS8, SignJWT } from "jose";
import type { McpPrincipal } from "./auth.js";

let privateKeyPromise: Promise<CryptoKey> | undefined;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable interna ${name}.`);
  return value;
}

function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n");
}

async function privateKey(): Promise<CryptoKey> {
  privateKeyPromise ??= importPKCS8(normalizePem(requiredEnvironment("MCP_IDENTITY_PRIVATE_KEY")), "EdDSA");
  return privateKeyPromise;
}

export async function createMcpIdentityAssertion(
  principal: McpPrincipal,
  requestId: string,
): Promise<string> {
  if (!principal.clerkUserId || principal.kind !== "oauth") {
    throw new Error("La aserción MCP requiere un principal OAuth con clerkUserId.");
  }

  const issuer = process.env.MCP_IDENTITY_ISSUER?.trim() || "tembleques-camila-mcp";
  const audience = process.env.MCP_BACKEND_AUDIENCE?.trim() || "tembleques-camila-backend";

  return new SignJWT({
    mcp_source: "mcp",
    request_id: requestId,
  })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(principal.clerkUserId)
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(crypto.randomUUID())
    .sign(await privateKey());
}
