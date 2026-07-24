import { createClerkClient, verifyToken } from "@clerk/backend";
import { timingSafeEqual } from "node:crypto";
import { User, type IUser, type Role } from "../models/User.js";
import { AppError } from "../lib/errors.js";
import { hasPermission, normalizeRole, roleFromMetadata, type Permission } from "../security/permissions.js";
import { verifyMcpIdentityAssertion } from "./mcp-identity.js";
import type { Context, Next } from "hono";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

type AuthSource = "web" | "mcp" | "service";

function safeTokenEquals(left: string, right: string | undefined): boolean {
  if (!right) return false;
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function serviceIdentityForToken(token: string): "admin" | "client" | null {
  if (safeTokenEquals(token, process.env.MCP_BACKEND_ADMIN_TOKEN)) return "admin";
  if (safeTokenEquals(token, process.env.MCP_BACKEND_CLIENT_TOKEN)) return "client";
  return null;
}

async function userFromClerk(clerkId: string): Promise<IUser> {
  let clerkUser: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
  try {
    clerkUser = await clerkClient.users.getUser(clerkId);
  } catch {
    throw new AppError("Usuario no encontrado en el proveedor de autenticación", 401, "AUTH_USER_NOT_FOUND");
  }

  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;
  if (!primaryEmail) {
    throw new AppError("No se pudo obtener el correo del usuario", 401, "AUTH_USER_NOT_FOUND");
  }

  const role = roleFromMetadata(clerkUser.publicMetadata);
  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || primaryEmail,
        email: primaryEmail,
        role,
      },
      $setOnInsert: { clerkId },
    },
    { upsert: true, new: true },
  );
  if (!user) throw new AppError("No se pudo sincronizar el usuario", 500, "AUTH_USER_SYNC_FAILED");
  return user;
}

async function serviceUser(serviceIdentity: "admin" | "client"): Promise<IUser> {
  const clerkId = `mcp_service_${serviceIdentity}`;
  const role: Role = serviceIdentity === "admin" ? "owner" : "client";
  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $set: { role },
      $setOnInsert: { clerkId, name: `MCP ${serviceIdentity}`, email: `${serviceIdentity}@mcp.internal` },
    },
    { upsert: true, new: true },
  );
  if (!user) throw new AppError("No se pudo preparar la identidad de servicio", 500, "AUTH_SERVICE_SYNC_FAILED");
  return user;
}

export type AuthVariables = {
  user: IUser;
  authSource: AuthSource;
};

type AuthContext = Context<{ Variables: AuthVariables }>;

export const authMiddleware = async (c: AuthContext, next: Next) => {
  const authHeader = c.req.header("Authorization");
  const assertion = c.req.header("X-MCP-Identity-Assertion")?.trim();
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Token de autorización requerido", 401, "AUTH_TOKEN_REQUIRED");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new AppError("Token de autorización requerido", 401, "AUTH_TOKEN_REQUIRED");

  if (assertion) {
    if (!safeTokenEquals(token, process.env.MCP_BACKEND_MCP_TOKEN)) {
      throw new AppError("Credencial interna MCP inválida", 401, "MCP_BRIDGE_TOKEN_INVALID");
    }
    try {
      const identity = await verifyMcpIdentityAssertion(assertion);
      if (typeof identity.sub !== "string") {
        throw new AppError("La identidad MCP no tiene usuario", 401, "MCP_IDENTITY_INVALID");
      }
      const user = await userFromClerk(identity.sub);
      c.set("user", user);
      c.set("authSource", "mcp");
      await next();
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("La identidad MCP es inválida o expiró", 401, "MCP_IDENTITY_INVALID");
    }
  }

  const serviceIdentity = serviceIdentityForToken(token);
  if (serviceIdentity) {
    c.set("user", await serviceUser(serviceIdentity));
    c.set("authSource", "service");
    await next();
    return;
  }

  // Clerk Mock Auth Bypass for E2E Testing
  if (process.env.AUTH_MOCKS_ENABLED === "true" && (token === "mock-owner-token" || token === "mock-client-token")) {
    const role: Role = token === "mock-owner-token" ? "owner" : "client";
    const email = `${role}@test.com`;
    const name = `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    const clerkId = `mock_${role}_id`;

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $setOnInsert: { clerkId, name, email, role } },
      { upsert: true, new: true },
    );
    if (!user) throw new AppError("No se pudo preparar el usuario de prueba", 500, "AUTH_MOCK_SYNC_FAILED");
    c.set("user", user);
    c.set("authSource", "web");
    await next();
    return;
  }

  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try {
    payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  } catch {
    throw new AppError(
      "Token inválido o expirado. Inicia sesión nuevamente.",
      401,
      "AUTH_TOKEN_INVALID",
    );
  }

  c.set("user", await userFromClerk(payload.sub));
  c.set("authSource", "web");
  await next();
};

export const requirePermission = (permission: Permission) => async (c: AuthContext, next: Next) => {
  const user = c.get("user");
  if (!hasPermission(user.role, permission)) {
    throw new AppError("No tienes permisos para realizar esta acción.", 403, "AUTH_FORBIDDEN");
  }
  await next();
};

export const requireAdmin = requirePermission("dashboard.read");

export function effectiveRole(user: IUser): Role {
  return normalizeRole(user.role);
};
