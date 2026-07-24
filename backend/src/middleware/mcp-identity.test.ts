import { describe, expect, it } from "vitest";
import { exportSPKI, generateKeyPair, SignJWT } from "jose";
import { verifyMcpIdentityAssertion } from "./mcp-identity.js";

describe("identidad firmada del MCP", () => {
  it("verifica issuer, audiencia, expiración y subject", async () => {
    const { privateKey, publicKey } = await generateKeyPair("EdDSA", { extractable: true });
    process.env.MCP_IDENTITY_PUBLIC_KEY = await exportSPKI(publicKey);
    process.env.MCP_IDENTITY_ISSUER = "tembleques-camila-mcp-test";
    process.env.MCP_BACKEND_AUDIENCE = "tembleques-camila-backend-test";

    const assertion = await new SignJWT({ mcp_source: "mcp", request_id: "request-test" })
      .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
      .setIssuer("tembleques-camila-mcp-test")
      .setAudience("tembleques-camila-backend-test")
      .setSubject("user_test")
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(privateKey);

    const claims = await verifyMcpIdentityAssertion(assertion);
    expect(claims.sub).toBe("user_test");
    expect(claims.request_id).toBe("request-test");

    delete process.env.MCP_IDENTITY_PUBLIC_KEY;
    delete process.env.MCP_IDENTITY_ISSUER;
    delete process.env.MCP_BACKEND_AUDIENCE;
  });
});
