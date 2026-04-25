import { Hono } from "hono";
import { Settings } from "../models/Settings.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { z } from "zod";

const settings = new Hono();

// Default settings fallback
const DEFAULT_SETTINGS = {
  categories: [
    { id: "pollera", label: "Polleras" },
    { id: "vestuario_masculino", label: "Vestuario Masculino" },
    { id: "infantil", label: "Infantil" },
    { id: "tembleques", label: "Tembleques" },
    { id: "accesorios", label: "Accesorios" },
    { id: "paquete_completo", label: "Paquetes Completos" },
  ],
  size_groups: [
    { label: "Adultos", sizes: ["S", "M", "L", "XL", "XXL"] },
    { label: "Infantil", sizes: ["2-4", "4-6", "6-8", "8-10", "10-12"] },
    { label: "Generales", sizes: ["Único"] },
  ],
};

// GET /api/settings - Public access to read settings
settings.get("/", async (c) => {
  let config = await Settings.findOne();
  
  if (!config) {
    // Create default settings if not exists
    config = await Settings.create(DEFAULT_SETTINGS);
  }

  return c.json({ settings: config });
});

// PUT /api/admin/settings - Admin only to update settings
const settingsSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    })
  ),
  size_groups: z.array(
    z.object({
      label: z.string().min(1),
      sizes: z.array(z.string().min(1)),
    })
  ),
});

settings.put("/", authMiddleware, requireAdmin, async (c) => {
  const rawBody = await c.req.json();
  const body = settingsSchema.parse(rawBody);
  
  let config = await Settings.findOne();
  if (!config) {
    config = new Settings(body);
  } else {
    config.categories = body.categories as any;
    config.size_groups = body.size_groups as any;
  }
  
  await config.save();
  
  return c.json({ settings: config });
});

export default settings;
