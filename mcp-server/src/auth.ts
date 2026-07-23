import { createClerkClient } from "@clerk/backend";
import { timingSafeEqual } from "node:crypto";

export type McpAuthMode = "guest" | "admin" | "client";
export type McpPrincipalKind = "guest" | "oauth" | "service";
export type McpClientIdentity = "service";
export type McpRole = "client" | "owner" | "operator" | "inventory" | "support";

export type McpScope =
  | "audit.read"
  | "availability.read"
  | "catalog.read"
  | "contacts.manage"
  | "coupons.manage"
  | "dashboard.read"
  | "incidents.read"
  | "incidents.write"
  | "inventory.read"
  | "inventory.write"
  | "maintenance.write"
  | "observability.read"
  | "payments.reconcile"
  | "payments.create"
  | "payments.refund"
  | "products.read"
  | "products.write"
  | "reports.fiscal"
  | "reports.read"
  | "reservations.read"
  | "reservations.write"
  | "rentals.cancel.own"
  | "rentals.create"
  | "rentals.read.own"
  | "settings.write"
  | "users.read"
  | "users.roles.write";

export const MCP_SCOPES: readonly McpScope[] = [
  "audit.read",
  "availability.read",
  "catalog.read",
  "contacts.manage",
  "coupons.manage",
  "dashboard.read",
  "incidents.read",
  "incidents.write",
  "inventory.read",
  "inventory.write",
  "maintenance.write",
  "observability.read",
  "payments.reconcile",
  "payments.create",
  "payments.refund",
  "products.read",
  "products.write",
  "reports.fiscal",
  "reports.read",
  "reservations.read",
  "reservations.write",
  "rentals.cancel.own",
  "rentals.create",
  "rentals.read.own",
  "settings.write",
  "users.read",
  "users.roles.write",
];

export interface McpPrincipal {
  id: string;
  kind: McpPrincipalKind;
  mode: McpAuthMode;
  scopes: ReadonlySet<McpScope>;
  clerkUserId?: string;
  role?: McpRole;
  serviceName?: "admin" | "client";
}

export interface McpAuthConfig {
  guestEnabled: boolean;
  allowedOrigins: ReadonlySet<string>;
  adminKey?: string;
  clientKey?: string;
  oauthEnabled: boolean;
  clerkSecretKey?: string;
  oauthIssuer?: string;
  oauthAudience?: string;
  resourceUrl?: string;
}

export interface McpOAuthIdentity {
  userId: string;
  clientId: string;
  scopes: readonly string[];
}

export type McpOAuthVerifier = (
  request: Request,
  config: McpAuthConfig,
) => Promise<McpOAuthIdentity | null>;

export type McpRoleResolver = (userId: string) => Promise<McpRole>;

const GUEST_SCOPES: ReadonlySet<McpScope> = new Set([
  "availability.read",
  "catalog.read",
]);

const CLIENT_SCOPES: ReadonlySet<McpScope> = new Set([
  ...GUEST_SCOPES,
  "rentals.cancel.own",
  "rentals.create",
  "rentals.read.own",
  "payments.create",
]);

const OWNER_SCOPES: ReadonlySet<McpScope> = new Set([
  ...CLIENT_SCOPES,
  "audit.read",
  "contacts.manage",
  "coupons.manage",
  "dashboard.read",
  "incidents.read",
  "incidents.write",
  "inventory.read",
  "inventory.write",
  "maintenance.write",
  "observability.read",
  "payments.reconcile",
  "payments.refund",
  "products.read",
  "products.write",
  "reports.fiscal",
  "reports.read",
  "reservations.read",
  "reservations.write",
  "settings.write",
  "users.read",
  "users.roles.write",
]);

export const MCP_ROLE_SCOPES: Readonly<Record<McpRole, ReadonlySet<McpScope>>> = {
  client: CLIENT_SCOPES,
  owner: OWNER_SCOPES,
  operator: new Set([
    "contacts.manage",
    "coupons.manage",
    "dashboard.read",
    "incidents.read",
    "incidents.write",
    "products.read",
    "reports.read",
    "observability.read",
    "reservations.read",
    "reservations.write",
    "users.read",
  ]),
  inventory: new Set([
    "dashboard.read",
    "incidents.read",
    "inventory.read",
    "inventory.write",
    "maintenance.write",
    "products.read",
    "products.write",
    "reservations.read",
  ]),
  support: new Set([
    "contacts.manage",
    "dashboard.read",
    "incidents.read",
    "incidents.write",
    "reservations.read",
    "users.read",
  ]),
};

function parseOrigins(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function parseUrl(name: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} debe ser una URL válida.`);
  }
}

export function loadMcpAuthConfig(env: NodeJS.ProcessEnv = process.env): McpAuthConfig {
  const oauthEnabled = env.MCP_OAUTH_ENABLED === "true";
  const clerkSecretKey = env.CLERK_SECRET_KEY?.trim() || undefined;
  const resourceUrl = parseUrl("MCP_RESOURCE_URL", env.MCP_RESOURCE_URL);
  const oauthIssuer = parseUrl(
    "MCP_OAUTH_ISSUER",
    env.MCP_OAUTH_ISSUER ?? env.CLERK_ISSUER_URL,
  );
  const oauthAudience = parseUrl(
    "MCP_OAUTH_AUDIENCE",
    env.MCP_OAUTH_AUDIENCE ?? resourceUrl,
  );

  if (oauthEnabled && !clerkSecretKey) {
    throw new Error("MCP_OAUTH_ENABLED=true necesita CLERK_SECRET_KEY.");
  }
  if (oauthEnabled && !oauthIssuer) {
    throw new Error("MCP_OAUTH_ENABLED=true necesita MCP_OAUTH_ISSUER.");
  }
  if (oauthEnabled && !resourceUrl) {
    throw new Error("MCP_OAUTH_ENABLED=true necesita MCP_RESOURCE_URL.");
  }
  if (oauthEnabled && !oauthAudience) {
    throw new Error("MCP_OAUTH_ENABLED=true necesita MCP_OAUTH_AUDIENCE o MCP_RESOURCE_URL.");
  }
  if (oauthEnabled && !env.MCP_BACKEND_MCP_TOKEN?.trim()) {
    throw new Error("MCP_OAUTH_ENABLED=true necesita MCP_BACKEND_MCP_TOKEN.");
  }
  if (oauthEnabled && !env.MCP_IDENTITY_PRIVATE_KEY?.trim()) {
    throw new Error("MCP_OAUTH_ENABLED=true necesita MCP_IDENTITY_PRIVATE_KEY.");
  }

  const adminKey = env.MCP_ADMIN_API_KEY?.trim() || undefined;
  const clientKey = env.MCP_CLIENT_API_KEY?.trim() || undefined;
  if (adminKey && clientKey && adminKey === clientKey) {
    throw new Error("MCP_ADMIN_API_KEY y MCP_CLIENT_API_KEY deben ser diferentes.");
  }

  return {
    guestEnabled: env.MCP_GUEST_ENABLED !== "false",
    adminKey,
    clientKey,
    oauthEnabled,
    clerkSecretKey,
    oauthIssuer,
    oauthAudience,
    resourceUrl,
    allowedOrigins: parseOrigins(env.MCP_ALLOWED_ORIGIN),
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function normalizeRole(value: unknown): McpRole {
  if (value === "owner" || value === "operator" || value === "inventory" || value === "support") {
    return value;
  }
  return "client";
}

function roleFromMetadata(metadata: unknown): McpRole {
  if (!metadata || typeof metadata !== "object") return "client";
  const role = (metadata as Record<string, unknown>).role;
  return normalizeRole(role);
}

function modeForRole(role: McpRole): McpAuthMode {
  return role === "client" ? "client" : "admin";
}

async function verifyClerkOAuthRequest(
  request: Request,
  config: McpAuthConfig,
): Promise<McpOAuthIdentity | null> {
  if (!config.oauthEnabled || !config.clerkSecretKey) return null;

  const clerk = createClerkClient({ secretKey: config.clerkSecretKey });
  const auth = await clerk.authenticateRequest(request, {
    acceptsToken: "oauth_token",
    audience: config.oauthAudience,
  });

  if (!auth.isAuthenticated || auth.tokenType !== "oauth_token") return null;
  const authObject = auth.toAuth();
  if (!authObject.isAuthenticated || authObject.tokenType !== "oauth_token" || !authObject.userId) {
    return null;
  }

  return {
    userId: authObject.userId,
    clientId: authObject.clientId ?? "unknown-client",
    scopes: authObject.scopes,
  };
}

async function resolveClerkRole(userId: string, config: McpAuthConfig): Promise<McpRole> {
  if (!config.clerkSecretKey) return "client";
  const clerk = createClerkClient({ secretKey: config.clerkSecretKey });
  const user = await clerk.users.getUser(userId);
  return roleFromMetadata(user.publicMetadata);
}

function servicePrincipal(
  id: string,
  serviceName: "admin" | "client",
): McpPrincipal {
  const role: McpRole = serviceName === "admin" ? "owner" : "client";
  return {
    id,
    kind: "service",
    mode: modeForRole(role),
    role,
    scopes: MCP_ROLE_SCOPES[role],
    serviceName,
  };
}

export async function authenticateMcpRequest(
  request: Request,
  config: McpAuthConfig,
  oauthVerifier: McpOAuthVerifier = verifyClerkOAuthRequest,
  roleResolver: McpRoleResolver = (userId) => resolveClerkRole(userId, config),
): Promise<McpPrincipal | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    if (!config.guestEnabled) return null;
    return {
      id: "mcp-guest",
      kind: "guest",
      mode: "guest",
      scopes: GUEST_SCOPES,
    };
  }

  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  if (config.adminKey && safeEqual(token, config.adminKey)) {
    return servicePrincipal("mcp-service-admin", "admin");
  }
  if (config.clientKey && safeEqual(token, config.clientKey)) {
    return servicePrincipal("mcp-service-client", "client");
  }

  try {
    const identity = await oauthVerifier(request, config);
    if (!identity) return null;
    const role = await roleResolver(identity.userId);
    return {
      id: `clerk:${identity.userId}`,
      kind: "oauth",
      mode: modeForRole(role),
      role,
      clerkUserId: identity.userId,
      scopes: MCP_ROLE_SCOPES[role],
    };
  } catch {
    return null;
  }
}

export function hasMcpScope(principal: McpPrincipal | undefined, scope: McpScope): boolean {
  return Boolean(principal?.scopes.has(scope));
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
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version, WWW-Authenticate",
    Vary: "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export const MCP_GUEST_SCOPES = GUEST_SCOPES;
export const MCP_CLIENT_SCOPES = CLIENT_SCOPES;
export const MCP_ADMIN_SCOPES = OWNER_SCOPES;
