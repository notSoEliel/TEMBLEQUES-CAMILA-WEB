import { importSPKI, jwtVerify, type JWTPayload } from "jose";

export interface McpIdentityClaims extends JWTPayload {
  mcp_source?: unknown;
  request_id?: unknown;
}

let publicKeyPromise: Promise<CryptoKey> | undefined;

function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n");
}

async function publicKey(): Promise<CryptoKey> {
  const value = process.env.MCP_IDENTITY_PUBLIC_KEY?.trim();
  if (!value) throw new Error("Falta MCP_IDENTITY_PUBLIC_KEY para validar la identidad MCP.");
  publicKeyPromise ??= importSPKI(normalizePem(value), "EdDSA");
  return publicKeyPromise;
}

export async function verifyMcpIdentityAssertion(
  assertion: string,
): Promise<McpIdentityClaims> {
  const issuer = process.env.MCP_IDENTITY_ISSUER?.trim() || "tembleques-camila-mcp";
  const audience = process.env.MCP_BACKEND_AUDIENCE?.trim() || "tembleques-camila-backend";
  const result = await jwtVerify(assertion, await publicKey(), {
    issuer,
    audience,
    algorithms: ["EdDSA"],
  });
  if (result.payload.mcp_source !== "mcp" || typeof result.payload.sub !== "string") {
    throw new Error("La aserción MCP no contiene una identidad válida.");
  }
  return result.payload;
}
