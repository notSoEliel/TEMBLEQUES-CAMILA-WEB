import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { Coupon } from "../models/Coupon.js";
import { AppError } from "../lib/errors.js";

const coupons = new Hono<{ Variables: AuthVariables }>();

const createCouponSchema = z.object({
  code: z.string().trim().min(3, "El código debe tener al menos 3 caracteres").max(40).regex(/^[A-Z0-9_-]+$/i, "El código solo puede contener letras, números, guion y guion bajo").toUpperCase(),
  discount_type: z.enum(["percentage", "fixed"]),
  value: z.number().positive("El valor del descuento debe ser mayor que 0"),
  is_active: z.boolean().default(true),
  expires_at: z.string().optional().nullable(),
  max_uses: z.number().int().min(1).optional().nullable(),
  min_purchase_amount: z.number().min(0).optional().nullable(),
  applicable_categories: z.array(z.string()).optional().nullable(),
});

function validateCouponRules(data: { discount_type: "percentage" | "fixed"; value: number; expires_at?: string | null }): void {
  if (data.discount_type === "percentage" && data.value > 100) {
    throw new AppError("El descuento porcentual no puede superar el 100 %.", 400, "COUPON_PERCENTAGE_INVALID");
  }
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    if (Number.isNaN(expiresAt.getTime())) throw new AppError("La fecha de expiración no es válida.", 400, "COUPON_DATE_INVALID");
    if (expiresAt <= new Date()) throw new AppError("La fecha de expiración debe ser futura.", 400, "COUPON_DATE_IN_PAST");
  }
}

const validateCouponSchema = z.object({
  code: z.string().min(1, "El código es requerido").toUpperCase(),
  subtotal: z.number().min(0).optional(),
  categories: z.array(z.string()).optional(),
});

// ─── CLIENT / PUBLIC ROUTES (Authenticated clients) ──────────────────────────
coupons.post("/validate", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { code } = validateCouponSchema.parse(body);

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    throw new AppError("El cupón ingresado no existe.", 404, "COUPON_NOT_FOUND");
  }

  if (!coupon.is_active) {
    throw new AppError("El cupón ya no está activo.", 400, "COUPON_INACTIVE");
  }

  if (coupon.expires_at && new Date() > coupon.expires_at) {
    throw new AppError("El cupón ha expirado.", 400, "COUPON_EXPIRED");
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    throw new AppError("El cupón ha alcanzado el límite máximo de usos.", 400, "COUPON_LIMIT_REACHED");
  }

  const { subtotal, categories } = validateCouponSchema.parse(body);

  if (coupon.min_purchase_amount && subtotal !== undefined) {
    if (subtotal < coupon.min_purchase_amount) {
      throw new AppError(`Este cupón requiere una compra mínima de $${coupon.min_purchase_amount}.`, 400, "COUPON_MIN_AMOUNT");
    }
  }

  if (coupon.applicable_categories && coupon.applicable_categories.length > 0 && categories !== undefined) {
    const hasApplicableCategory = categories.some(cat => coupon.applicable_categories!.includes(cat));
    if (!hasApplicableCategory) {
      throw new AppError("El cupón no aplica a ninguna de las piezas seleccionadas.", 400, "COUPON_CATEGORY_RESTRICTION");
    }
  }

  return c.json({
    valid: true,
    coupon: {
      code: coupon.code,
      discount_type: coupon.discount_type,
      value: coupon.value,
    },
  });
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
coupons.get("/", authMiddleware, requirePermission("coupons.manage"), async (c) => {
  const allCoupons = await Coupon.find().sort({ createdAt: -1 });
  return c.json({ coupons: allCoupons });
});

coupons.post("/", authMiddleware, requirePermission("coupons.manage"), async (c) => {
  const body = await c.req.json();
  const data = createCouponSchema.parse(body);
  validateCouponRules(data);

  const existing = await Coupon.findOne({ code: data.code });
  if (existing) {
    throw new AppError("Ya existe un cupón con este código.", 400, "COUPON_DUPLICATE");
  }

  const coupon = await Coupon.create({
    ...data,
    expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
    max_uses: data.max_uses || undefined,
    min_purchase_amount: data.min_purchase_amount || undefined,
    applicable_categories: data.applicable_categories || undefined,
  });

  return c.json({ coupon }, 201);
});

coupons.put("/:id", authMiddleware, requirePermission("coupons.manage"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const data = createCouponSchema.partial().parse(body);

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new AppError("Cupón no encontrado.", 404, "COUPON_NOT_FOUND");
  }

  validateCouponRules({
    discount_type: data.discount_type ?? coupon.discount_type,
    value: data.value ?? coupon.value,
    expires_at: data.expires_at === null ? null : data.expires_at ?? coupon.expires_at?.toISOString(),
  });

  if (data.code && data.code !== coupon.code) {
    const existing = await Coupon.findOne({ code: data.code });
    if (existing) {
      throw new AppError("Ya existe un cupón con este código.", 400, "COUPON_DUPLICATE");
    }
  }

  Object.assign(coupon, {
    ...data,
    expires_at: data.expires_at === null ? undefined : data.expires_at ? new Date(data.expires_at) : coupon.expires_at,
    max_uses: data.max_uses === null ? undefined : data.max_uses ? data.max_uses : coupon.max_uses,
    min_purchase_amount: data.min_purchase_amount === null ? undefined : data.min_purchase_amount !== undefined ? data.min_purchase_amount : coupon.min_purchase_amount,
    applicable_categories: data.applicable_categories === null ? undefined : data.applicable_categories !== undefined ? data.applicable_categories : coupon.applicable_categories,
  });

  await coupon.save();
  return c.json({ coupon });
});

coupons.delete("/:id", authMiddleware, requirePermission("coupons.manage"), async (c) => {
  const id = c.req.param("id");
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) {
    throw new AppError("Cupón no encontrado.", 404, "COUPON_NOT_FOUND");
  }
  return c.json({ message: "Cupón eliminado exitosamente.", coupon });
});

export default coupons;
