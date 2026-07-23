import { describe, expect, it } from "bun:test";
import { exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { createMcpIdentityAssertion } from "./identity.js";

describe("aserción de identidad MCP", () => {
  it("firma una identidad OAuth breve sin incluir el token del usuario", async () => {
    const { privateKey, publicKey } = await generateKeyPair("EdDSA", { extractable: true });
    process.env.MCP_IDENTITY_PRIVATE_KEY = await exportPKCS8(privateKey);
    process.env.MCP_IDENTITY_ISSUER = "tembleques-camila-mcp-test";
    process.env.MCP_BACKEND_AUDIENCE = "tembleques-camila-backend-test";

    const token = await createMcpIdentityAssertion({
      id: "clerk:user_test",
      kind: "oauth",
      mode: "client",
      clerkUserId: "user_test",
      role: "client",
      scopes: new Set(["rentals.create"]),
    }, "mcp-test-request");
    const result = await jwtVerify(token, publicKey, {
      issuer: "tembleques-camila-mcp-test",
      audience: "tembleques-camila-backend-test",
    });

    expect(result.payload.sub).toBe("user_test");
    expect(result.payload.mcp_source).toBe("mcp");
    expect(result.payload.request_id).toBe("mcp-test-request");
    expect(result.payload).not.toHaveProperty("token");

    delete process.env.MCP_IDENTITY_PRIVATE_KEY;
    delete process.env.MCP_IDENTITY_ISSUER;
    delete process.env.MCP_BACKEND_AUDIENCE;
  });
});
