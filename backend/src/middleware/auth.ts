import { createClerkClient, verifyToken } from "@clerk/backend";
import { timingSafeEqual } from "node:crypto";
import { User, type IUser, type Role } from "../models/User.js";
import { AppError } from "../lib/errors.js";
import { hasPermission, normalizeRole, roleFromMetadata, type Permission } from "../security/permissions.js";
import type { Context, Next } from "hono";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

function safeTokenEquals(left: string, right: string | undefined): boolean {
  if (!right) return false;
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function serviceRoleForToken(token: string): "admin" | "client" | null {
  if (safeTokenEquals(token, process.env.MCP_BACKEND_ADMIN_TOKEN)) return "admin";
  if (safeTokenEquals(token, process.env.MCP_BACKEND_CLIENT_TOKEN)) return "client";
  return null;
}

export type AuthVariables = {
  user: IUser;
};

type AuthContext = Context<{ Variables: AuthVariables }>;

export const authMiddleware = async (c: AuthContext, next: Next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Token de autorización requerido", 401, "AUTH_TOKEN_REQUIRED");
  }

  const token = authHeader.split(" ")[1];

  const serviceRole = serviceRoleForToken(token);
  if (serviceRole) {
    const clerkId = `mcp_service_${serviceRole}`;
    const role: Role = serviceRole === "admin" ? "owner" : "client";
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: { role }, $setOnInsert: { clerkId, name: `MCP ${serviceRole}`, email: `${serviceRole}@mcp.internal` } },
      { upsert: true, new: true },
    );
    c.set("user", user);
    await next();
    return;
  }

  // Clerk Mock Auth Bypass for E2E Testing
  if (process.env.AUTH_MOCKS_ENABLED === "true" && (token === "mock-admin-token" || token === "mock-client-token")) {
    const role: Role = token === "mock-admin-token" ? "owner" : "client";
    const email = `${role}@test.com`;
    const name = `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    const clerkId = `mock_${role}_id`;

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $setOnInsert: { clerkId, name, email, role } },
      { upsert: true, new: true },
    );
    c.set("user", user);
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

  const clerkId = payload.sub;

  // Upsert: if user doesn't exist in MongoDB yet (e.g. first OAuth login),
  // pull their profile from Clerk and create them.
  let user = await User.findOne({ clerkId });
  if (!user) {
    let clerkUser: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
    try {
      clerkUser = await clerkClient.users.getUser(clerkId);
    } catch {
      throw new AppError("Usuario no encontrado en el proveedor de autenticación", 401, "AUTH_USER_NOT_FOUND");
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;

    if (!primaryEmail) {
      throw new AppError("No se pudo obtener el correo del usuario", 401, "AUTH_USER_NOT_FOUND");
    }

    const role = roleFromMetadata(clerkUser.publicMetadata);

    user = await User.create({
      clerkId,
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || primaryEmail,
      email: primaryEmail,
      role,
    });
  }

  c.set("user", user);
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

export function effectiveRole(user: IUser): Exclude<Role, "admin"> {
  return normalizeRole(user.role);
}
