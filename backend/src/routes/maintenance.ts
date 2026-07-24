import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { MaintenanceBlock } from "../models/MaintenanceBlock.js";
import { Product } from "../models/Product.js";
import { Settings } from "../models/Settings.js";
import { User } from "../models/User.js";
import { AppError } from "../lib/errors.js";
import { getPaginationParams, createPaginatedResponse } from "../lib/pagination.js";
import { adminAuditMiddleware } from "../services/audit.js";
import { dispatchNotification } from "../services/notifications.js";
import { structuredLog } from "../services/observability.js";
import { maintenanceRangesOverlap, parseMaintenanceRange } from "../services/maintenance-rules.js";

const maintenance = new Hono<{ Variables: AuthVariables }>();

const createBlockSchema = z.object({
  productId: z.string().min(1, "El ID del producto es requerido"),
  selectedSize: z.string().min(1, "La talla es requerida"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  reason: z.string().optional(),
});

maintenance.use("/*", authMiddleware, adminAuditMiddleware);
maintenance.use("/", requirePermission("inventory.read"));

// GET /api/admin/maintenance - List all maintenance blocks
maintenance.get("/", async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const [blocks, total] = await Promise.all([MaintenanceBlock.find()
    .populate("product_id", "name category images variants")
    .sort({ start_date: -1 }).skip(skip).limit(limit), MaintenanceBlock.countDocuments()]);
  return c.json({ ...createPaginatedResponse(blocks, total, page, limit), blocks });
});

maintenance.get("/low-stock", requirePermission("inventory.read"), async (c) => {
  const { page, limit, skip } = getPaginationParams(c);
  const settings = await Settings.findOne().select("low_stock_threshold").lean<{ low_stock_threshold?: number }>().exec();
  const threshold = settings?.low_stock_threshold ?? 1;
  const now = new Date();
  const activeBlocks = await MaintenanceBlock.find({ start_date: { $lte: now }, end_date: { $gt: now } })
    .select("product_id selected_size").lean();
  const activeBlockKeys = new Set(activeBlocks.map((block) => `${block.product_id.toString()}:${block.selected_size}`));
  const products = await Product.find({ "variants.stock": { $lte: threshold } })
    .select("name name_en images variants category")
    .sort({ name: 1 }).lean();
  const lowStock = products.flatMap((product) => {
    const variants = product.variants
      .filter((variant) => variant.stock <= threshold && !variant.in_maintenance && !activeBlockKeys.has(`${product._id.toString()}:${variant.size}`))
      .map((variant) => ({ size: variant.size, stock: variant.stock }));
    return variants.length > 0 ? [{ _id: product._id.toString(), name: product.name, name_en: product.name_en, images: product.images, category: product.category, variants }] : [];
  });
  const data = lowStock.slice(skip, skip + limit);
  await notifyLowStockOperators(data, threshold);
  return c.json({ ...createPaginatedResponse(data, lowStock.length, page, limit), threshold });
});

maintenance.patch("/threshold", requirePermission("inventory.write"), async (c) => {
  const body = z.object({ threshold: z.number().int().min(0).max(1000) }).parse(await c.req.json());
  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: { low_stock_threshold: body.threshold } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return c.json({ threshold: settings.low_stock_threshold });
});

// POST /api/admin/maintenance - Create maintenance block
maintenance.post("/", requirePermission("inventory.write"), async (c) => {
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

  const dateRange = parseMaintenanceRange(data.startDate, data.endDate);
  if (!dateRange) {
    throw new AppError("La fecha de inicio debe ser anterior a la fecha de fin.", 400, "MAINTENANCE_DATE_RANGE_INVALID");
  }
  const overlappingBlock = await MaintenanceBlock.findOne({
    product_id: data.productId,
    selected_size: data.selectedSize,
    start_date: { $lt: dateRange.endDate },
    end_date: { $gt: dateRange.startDate },
  }).select("start_date end_date").lean();
  if (overlappingBlock && maintenanceRangesOverlap(dateRange, { startDate: overlappingBlock.start_date, endDate: overlappingBlock.end_date })) {
    throw new AppError("Ya existe un mantenimiento que se solapa con este rango.", 409, "MAINTENANCE_OVERLAP");
  }

  const block = await MaintenanceBlock.create({
    product_id: data.productId,
    selected_size: data.selectedSize,
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
    reason: data.reason,
  });

  return c.json({ block }, 201);
});

// DELETE /api/admin/maintenance/:id - Delete maintenance block
maintenance.delete("/:id", requirePermission("inventory.write"), async (c) => {
  const id = c.req.param("id");
  const block = await MaintenanceBlock.findByIdAndDelete(id);
  if (!block) {
    throw new AppError("Bloque de mantenimiento no encontrado.", 404, "MAINTENANCE_NOT_FOUND");
  }
  return c.json({ message: "Bloque de mantenimiento eliminado.", block });
});

export default maintenance;

interface LowStockItem {
  _id: string;
  name: string;
  variants: Array<{ size: string; stock: number }>;
}

async function notifyLowStockOperators(items: LowStockItem[], threshold: number): Promise<void> {
  if (items.length === 0) return;
  const recipients = await User.find({ role: { $in: ["owner", "operator", "inventory"] } }).select("_id email").lean();
  await Promise.all(items.flatMap((item) => item.variants.flatMap((variant) => recipients.map((recipient) =>
    dispatchNotification({
      userId: recipient._id.toString(),
      email: recipient.email,
      type: "low_stock",
      title: "Inventario bajo",
      message: `${item.name} (${variant.size}) tiene ${variant.stock} unidad(es) disponible(s).`,
      idempotencyKey: `low-stock:${item._id.toString()}:${variant.size}:${threshold}:${new Date().toISOString().slice(0, 10)}`,
      metadata: { productId: item._id.toString(), size: variant.size, threshold: String(threshold) },
    }).catch((error: unknown) => {
      structuredLog("error", "notification.dispatch_failed", {
        source: "inventory.low_stock",
        productId: item._id.toString(),
        errorCode: error instanceof Error ? error.name : "NOTIFICATION_DISPATCH_FAILED",
      });
    }),
  ))));
}
