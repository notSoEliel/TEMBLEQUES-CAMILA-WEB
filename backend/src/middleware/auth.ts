import jwt from "jsonwebtoken";
import { User, type IUser } from "../models/User.js";
import { AppError } from "../lib/errors.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export type AuthVariables = {
  user: IUser;
};

export const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Token de autorización requerido", 401, "AUTH_TOKEN_REQUIRED");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      throw new AppError("Usuario no encontrado o cuenta eliminada", 401, "AUTH_USER_NOT_FOUND");
    }
    c.set("user", user);
    await next();
  } catch (err) {
    // Re-throw AppErrors (already formatted)
    if (err instanceof AppError) throw err;
    throw new AppError("Token inválido o expirado. Inicia sesión nuevamente.", 401, "AUTH_TOKEN_INVALID");
  }
};

export const requireAdmin = async (c: any, next: () => Promise<void>) => {
  const user = c.get("user") as IUser;
  if (user.role !== "admin") {
    throw new AppError("Acceso denegado. Se requiere rol de administrador.", 403, "AUTH_FORBIDDEN");
  }
  await next();
};

