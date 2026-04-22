import { Hono } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const auth = new Hono();

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "La contrasena es requerida"),
});

// POST /api/auth/register
auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return c.json({ error: "Ya existe una cuenta con ese email" }, 400);
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
  } catch (error: any) {
    if (error.issues) {
      return c.json({ error: error.issues[0].message }, 400);
    }
    return c.json({ error: error.message || "Error al registrar" }, 500);
  }
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    const user = await User.findOne({ email: data.email });
    if (!user) {
      return c.json({ error: "Credenciales invalidas" }, 401);
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      return c.json({ error: "Credenciales invalidas" }, 401);
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
  } catch (error: any) {
    if (error.issues) {
      return c.json({ error: error.issues[0].message }, 400);
    }
    return c.json({ error: error.message || "Error al iniciar sesion" }, 500);
  }
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
