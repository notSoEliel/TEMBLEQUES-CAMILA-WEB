import { Hono } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const auth = new Hono();

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

// POST /api/auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json();
  const data = registerSchema.parse(body); // ZodError → global handler

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new AppError("Ya existe una cuenta con ese correo electrónico", 400, "AUTH_EMAIL_TAKEN");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const user = await User.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    phone: data.phone,
    role: "client",
  });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

  return c.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json();
  const data = loginSchema.parse(body); // ZodError → global handler

  const user = await User.findOne({ email: data.email });
  if (!user) {
    // Deliberately vague to avoid user enumeration
    throw new AppError("Credenciales inválidas", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    throw new AppError("Credenciales inválidas", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

  return c.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// GET /api/auth/me
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
  });
});

export default auth;

