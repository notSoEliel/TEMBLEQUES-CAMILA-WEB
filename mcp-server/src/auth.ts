import { timingSafeEqual } from "node:crypto";

export type McpAuthMode = "admin" | "client";

export type McpScope =
  | "audit.read"
  | "availability.read"
  | "catalog.read"
  | "contacts.manage"
  | "dashboard.read"
  | "inventory.write"
  | "payments.reconcile"
  | "payments.create"
  | "products.write"
  | "reports.read"
  | "reservations.read"
  | "reservations.write"
  | "rentals.cancel.own"
  | "rentals.create"
  | "rentals.read.own"
  | "settings.write"
  | "users.read"
  | "users.roles.write";

export interface McpPrincipal {
  id: string;
  mode: McpAuthMode;
  scopes: ReadonlySet<McpScope>;
}

export interface McpAuthConfig {
  required: boolean;
  allowedOrigins: ReadonlySet<string>;
  adminKey?: string;
  clientKey?: string;
}

const ADMIN_SCOPES: ReadonlySet<McpScope> = new Set([
  "audit.read",
  "availability.read",
  "catalog.read",
  "contacts.manage",
  "dashboard.read",
  "inventory.write",
  "payments.reconcile",
  "payments.create",
  "products.write",
  "reports.read",
  "reservations.read",
  "reservations.write",
  "rentals.cancel.own",
  "rentals.create",
  "rentals.read.own",
  "settings.write",
  "users.read",
  "users.roles.write",
]);

const CLIENT_SCOPES: ReadonlySet<McpScope> = new Set([
  "availability.read",
  "catalog.read",
  "rentals.cancel.own",
  "rentals.create",
  "rentals.read.own",
  "payments.create",
]);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

function parseOrigins(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function loadMcpAuthConfig(env: NodeJS.ProcessEnv = process.env): McpAuthConfig {
  const required = parseBoolean(env.MCP_AUTH_REQUIRED, true);
  const adminKey = env.MCP_ADMIN_API_KEY?.trim() || undefined;
  const clientKey = env.MCP_CLIENT_API_KEY?.trim() || undefined;

  if (required && !adminKey && !clientKey) {
    throw new Error(
      "MCP_AUTH_REQUIRED=true necesita MCP_ADMIN_API_KEY o MCP_CLIENT_API_KEY.",
    );
  }

  if (adminKey && clientKey && adminKey === clientKey) {
    throw new Error("MCP_ADMIN_API_KEY y MCP_CLIENT_API_KEY deben ser diferentes.");
  }

  return {
    required,
    adminKey,
    clientKey,
    allowedOrigins: parseOrigins(env.MCP_ALLOWED_ORIGIN),
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function authenticateMcpRequest(
  request: Request,
  config: McpAuthConfig,
): McpPrincipal | null {
  if (!config.required) {
    return {
      id: "local-open-access",
      mode: "admin",
      scopes: ADMIN_SCOPES,
    };
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  if (config.adminKey && safeEqual(token, config.adminKey)) {
    return { id: "mcp-admin-key", mode: "admin", scopes: ADMIN_SCOPES };
  }

  if (config.clientKey && safeEqual(token, config.clientKey)) {
    return { id: "mcp-client-key", mode: "client", scopes: CLIENT_SCOPES };
  }

  return null;
}

export function hasMcpScope(principal: McpPrincipal | undefined, scope: McpScope): boolean {
  return !principal || principal.scopes.has(scope);
}

export function isMcpOriginAllowed(
  request: Request,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins.has(origin);
}

export function getMcpCorsHeaders(
  request: Request,
  allowedOrigins: ReadonlySet<string>,
): Record<string, string> {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version, Authorization",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
    Vary: "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export const MCP_ADMIN_SCOPES = ADMIN_SCOPES;
export const MCP_CLIENT_SCOPES = CLIENT_SCOPES;
