import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { User, type IUser } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export type AuthVariables = {
  user: IUser;
};

export const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Token de autorizacion requerido" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return c.json({ error: "Usuario no encontrado" }, 401);
    }
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Token invalido o expirado" }, 401);
  }
};

export const requireAdmin = async (c: any, next: () => Promise<void>) => {
  const user = c.get("user") as IUser;
  if (user.role !== "admin") {
    return c.json({ error: "Acceso denegado. Se requiere rol de administrador." }, 403);
  }
  await next();
};
