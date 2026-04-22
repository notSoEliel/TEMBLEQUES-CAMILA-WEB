import { createClerkClient, verifyToken } from "@clerk/backend";
import { User, type IUser } from "../models/User.js";
import { AppError } from "../lib/errors.js";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export type AuthVariables = {
  user: IUser;
};

export const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Token de autorización requerido", 401, "AUTH_TOKEN_REQUIRED");
  }

  const token = authHeader.split(" ")[1];

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

    const role = (clerkUser.publicMetadata?.role as "client" | "admin") ?? "client";

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

export const requireAdmin = async (c: any, next: () => Promise<void>) => {
  const user = c.get("user") as IUser;
  if (user.role !== "admin") {
    throw new AppError("Acceso denegado. Se requiere rol de administrador.", 403, "AUTH_FORBIDDEN");
  }
  await next();
};
