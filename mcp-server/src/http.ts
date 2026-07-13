import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTemblequesMcpServer } from "./server.js";
import {
  authenticateMcpRequest,
  getMcpCorsHeaders,
  isMcpOriginAllowed,
  loadMcpAuthConfig,
  type McpPrincipal,
} from "./auth.js";

const port = Number(process.env.PORT ?? process.env.MCP_PORT ?? 3000);
const authConfig = loadMcpAuthConfig();

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

Bun.serve({
  port,
  async fetch(request) {
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

    const principal: McpPrincipal | null = authenticateMcpRequest(request, authConfig);
    if (!principal) {
      return json(
        { error: "Autenticación MCP requerida", code: "MCP_AUTH_REQUIRED" },
        401,
        { ...corsHeaders, "WWW-Authenticate": "Bearer" },
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
  },
});

console.log(`[MCP HTTP] Tembleques Camila MCP listening on port ${port}`);
console.log(`[MCP HTTP] Health: http://localhost:${port}/health`);
console.log(`[MCP HTTP] Endpoint: http://localhost:${port}/mcp`);
