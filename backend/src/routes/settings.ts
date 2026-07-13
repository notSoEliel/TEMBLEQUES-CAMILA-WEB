import { Hono } from "hono";
import { Settings, type ICategoryConfig } from "../models/Settings.js";
import { Product } from "../models/Product.js";
import { authMiddleware, requirePermission } from "../middleware/auth.js";
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
      _id: z.string().optional(),
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

settings.put("/", authMiddleware, requirePermission("settings.write"), async (c) => {
  const rawBody = await c.req.json();
  const body = settingsSchema.parse(rawBody);
  
  let config = await Settings.findOne();
  
  if (!config) {
    config = new Settings(body);
  } else {
    // Check for ID migrations before saving
    const oldCategories = config.categories;
    const newCategories = body.categories;

    for (const newCat of newCategories) {
      if (newCat._id) {
        const oldCat = oldCategories.find((c: ICategoryConfig) => c._id && c._id.toString() === newCat._id);
        if (oldCat && oldCat.id !== newCat.id) {
          console.log(`Migrating products from category "${oldCat.id}" to "${newCat.id}"...`);
          await Product.updateMany(
            { category: oldCat.id },
            { $set: { "category.$": newCat.id } }
          );
        }
      }
    }

    config.categories = body.categories as any;
    config.size_groups = body.size_groups as any;
  }
  
  await config.save();
  
  return c.json({ settings: config });
});

export default settings;
