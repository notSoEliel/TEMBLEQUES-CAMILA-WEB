import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTemblequesMcpServer } from "./server.js";

const port = Number(process.env.PORT ?? process.env.MCP_PORT ?? 3000);
const allowedOrigin = process.env.MCP_ALLOWED_ORIGIN ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version, Authorization",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/health") {
      return json({
        status: "ok",
        name: "tembleques-camila-mcp",
        backendUrl: process.env.MCP_BACKEND_URL ?? "http://localhost:3000",
        adminTokenConfigured: Boolean(process.env.MCP_ADMIN_TOKEN),
        clientTokenConfigured: Boolean(process.env.MCP_CLIENT_TOKEN),
      });
    }

    if (url.pathname !== "/mcp") {
      return json({ error: "Ruta no encontrada" }, 404);
    }

    if (!["POST", "GET", "DELETE"].includes(request.method)) {
      return json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Metodo no permitido" },
        id: null,
      }, 405);
    }

    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createTemblequesMcpServer();

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
      }, 500);
    }
  },
});

console.log(`[MCP HTTP] Tembleques Camila MCP listening on port ${port}`);
console.log(`[MCP HTTP] Health: http://localhost:${port}/health`);
console.log(`[MCP HTTP] Endpoint: http://localhost:${port}/mcp`);
