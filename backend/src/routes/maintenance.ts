import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { MaintenanceBlock } from "../models/MaintenanceBlock.js";
import { Product } from "../models/Product.js";
import { AppError } from "../lib/errors.js";

const maintenance = new Hono<{ Variables: AuthVariables }>();

const createBlockSchema = z.object({
  productId: z.string().min(1, "El ID del producto es requerido"),
  selectedSize: z.string().min(1, "La talla es requerida"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  reason: z.string().optional(),
});

maintenance.use("/*", authMiddleware);
maintenance.use("/", requirePermission("inventory.read"));
maintenance.use("/:id", requirePermission("inventory.write"));

// GET /api/admin/maintenance - List all maintenance blocks
maintenance.get("/", async (c) => {
  const blocks = await MaintenanceBlock.find()
    .populate("product_id", "name category images variants")
    .sort({ start_date: -1 });
  return c.json({ blocks });
});

// POST /api/admin/maintenance - Create maintenance block
maintenance.post("/", async (c) => {
  const body = await c.req.json();
  const data = createBlockSchema.parse(body);

  const product = await Product.findById(data.productId);
  if (!product) {
    throw new AppError("Producto no encontrado.", 404, "PRODUCT_NOT_FOUND");
  }

  const variant = product.variants.find((v) => v.size === data.selectedSize);
  if (!variant) {
    throw new AppError(`La talla "${data.selectedSize}" no existe para este producto.`, 400, "VARIANT_NOT_FOUND");
  }

  const block = await MaintenanceBlock.create({
    product_id: data.productId,
    selected_size: data.selectedSize,
    start_date: new Date(data.startDate),
    end_date: new Date(data.endDate),
    reason: data.reason,
  });

  return c.json({ block }, 201);
});

// DELETE /api/admin/maintenance/:id - Delete maintenance block
maintenance.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const block = await MaintenanceBlock.findByIdAndDelete(id);
  if (!block) {
    throw new AppError("Bloque de mantenimiento no encontrado.", 404, "MAINTENANCE_NOT_FOUND");
  }
  return c.json({ message: "Bloque de mantenimiento eliminado.", block });
});

export default maintenance;
