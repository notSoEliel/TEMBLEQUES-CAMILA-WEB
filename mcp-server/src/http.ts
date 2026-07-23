import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTemblequesMcpServer } from "./server.js";
import {
  authenticateMcpRequest,
  getMcpCorsHeaders,
  isMcpOriginAllowed,
  loadMcpAuthConfig,
  type McpPrincipal,
} from "./auth.js";

function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

const PUBLIC_TOOLS = new Set([
  "catalog.products.search",
  "catalog.availability.check",
]);

function protectedResourceMetadataUrl(
  request: Request,
  authConfig: ReturnType<typeof loadMcpAuthConfig>,
): string {
  const resourceBaseUrl = authConfig.resourceUrl ?? request.url;
  return new URL("/.well-known/oauth-protected-resource/mcp", resourceBaseUrl).toString();
}

function authorizationChallenge(
  request: Request,
  authConfig: ReturnType<typeof loadMcpAuthConfig>,
): string {
  return `Bearer resource_metadata="${protectedResourceMetadataUrl(request, authConfig)}"`;
}

function protectedResourceMetadata(request: Request, authConfig: ReturnType<typeof loadMcpAuthConfig>): Record<string, unknown> {
  const resourceUrl = authConfig.resourceUrl ?? new URL("/mcp", request.url).toString();
  const authorizationServers = authConfig.oauthIssuer ? [authConfig.oauthIssuer] : [];
  return {
    resource: resourceUrl,
    authorization_servers: authorizationServers,
    scopes_supported: ["openid", "profile", "email"],
    bearer_methods_supported: ["header"],
  };
}

async function containsProtectedToolCall(request: Request): Promise<boolean> {
  if (request.method !== "POST") return false;
  try {
    const body = await request.clone().json() as unknown;
    const messages = Array.isArray(body) ? body : [body];
    return messages.some((message) => {
      if (!message || typeof message !== "object") return false;
      const record = message as Record<string, unknown>;
      if (record.method !== "tools/call") return false;
      const params = record.params;
      if (!params || typeof params !== "object") return true;
      const name = (params as Record<string, unknown>).name;
      return typeof name !== "string" || !PUBLIC_TOOLS.has(name);
    });
  } catch {
    return false;
  }
}

export async function handleMcpHttpRequest(
  request: Request,
  authConfig: ReturnType<typeof loadMcpAuthConfig>,
): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getMcpCorsHeaders(request, authConfig.allowedOrigins);

    if (request.method === "OPTIONS") {
      if (!isMcpOriginAllowed(request, authConfig.allowedOrigins)) {
        return json({ error: "Origen no permitido" }, 403, corsHeaders);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/health") {
      return json({
        status: "ok",
        name: "tembleques-camila-mcp",
      }, 200, corsHeaders);
    }

    if (url.pathname === "/.well-known/oauth-protected-resource/mcp"
      || url.pathname === "/.well-known/oauth-protected-resource") {
      if (request.method !== "GET") {
        return json({ error: "Metodo no permitido" }, 405, corsHeaders);
      }
      return json(protectedResourceMetadata(request, authConfig), 200, corsHeaders);
    }

    if (url.pathname !== "/mcp") {
      return json({ error: "Ruta no encontrada" }, 404);
    }

    if (!["POST", "GET", "DELETE"].includes(request.method)) {
      return json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Metodo no permitido" },
        id: null,
      }, 405, corsHeaders);
    }

    if (!isMcpOriginAllowed(request, authConfig.allowedOrigins)) {
      return json({ error: "Origen no permitido" }, 403, corsHeaders);
    }

    const principal: McpPrincipal | null = await authenticateMcpRequest(request, authConfig);
    if (!principal) {
      return json(
        { error: "Autenticación OAuth o API key de servicio requerida", code: "MCP_AUTH_REQUIRED" },
        401,
        { ...corsHeaders, "WWW-Authenticate": authorizationChallenge(request, authConfig) },
      );
    }

    if (principal.kind === "guest" && await containsProtectedToolCall(request)) {
      return json(
        { error: "Esta tool requiere autenticación OAuth", code: "MCP_OAUTH_REQUIRED" },
        401,
        { ...corsHeaders, "WWW-Authenticate": authorizationChallenge(request, authConfig) },
      );
    }

    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createTemblequesMcpServer(principal);

    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    } catch (error) {
      console.error("[MCP HTTP] Error handling request", error);
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
      return json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Error interno del servidor MCP" },
        id: null,
      }, 500, corsHeaders);
    }
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? process.env.MCP_PORT ?? 3000);
  const authConfig = loadMcpAuthConfig();
  Bun.serve({
    port,
    fetch: (request) => handleMcpHttpRequest(request, authConfig),
  });

  console.log(`[MCP HTTP] Tembleques Camila MCP listening on port ${port}`);
  console.log(`[MCP HTTP] Health: http://localhost:${port}/health`);
  console.log(`[MCP HTTP] Endpoint: http://localhost:${port}/mcp`);
}
