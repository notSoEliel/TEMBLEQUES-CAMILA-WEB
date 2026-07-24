import { SystemAlert, type AlertSeverity, type ISystemAlert } from "../models/SystemAlert.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { sanitizeAuditMetadata } from "./audit.js";
import { Settings } from "../models/Settings.js";
import { MaintenanceBlock } from "../models/MaintenanceBlock.js";

export interface RaiseAlertInput {
  type: string;
  severity: AlertSeverity;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export async function raiseSystemAlert(input: RaiseAlertInput): Promise<ISystemAlert> {
  const existing = await SystemAlert.findOne({ type: input.type, status: "open" });
  if (existing) return existing;

  return SystemAlert.create({
    ...input,
    metadata: input.metadata ? sanitizeAuditMetadata(input.metadata) : undefined,
  });
}

export async function refreshOperationalAlerts(): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const settings = await Settings.findOne().select("low_stock_threshold").lean<{ low_stock_threshold?: number }>().exec();
  const lowStockThreshold = settings?.low_stock_threshold ?? 1;
  const [failedPayments, lateRentals, lowStockProducts] = await Promise.all([
    Rental.countDocuments({ payment_status: "failed", updatedAt: { $gte: since } }),
    Rental.countDocuments({ status: "late" }),
    findLowStockProducts(lowStockThreshold),
  ]);

  if (failedPayments > 0) {
    await raiseSystemAlert({
      type: "payment_failures_24h",
      severity: "warning",
      message: `${failedPayments} pago(s) fallido(s) durante las últimas 24 horas.`,
      source: "payments",
      metadata: { count: failedPayments },
    });
  }

  if (lateRentals > 0) {
    await raiseSystemAlert({
      type: "late_rentals",
      severity: "warning",
      message: `${lateRentals} reserva(s) aparecen como atrasadas.`,
      source: "rentals",
      metadata: { count: lateRentals },
    });
  }

  if (lowStockProducts.length > 0) {
    await raiseSystemAlert({
      type: "low_stock",
      severity: "info",
      message: `${lowStockProducts.length} producto(s) tienen una variante con inventario bajo.`,
      source: "inventory",
      metadata: {
        count: lowStockProducts.length,
        threshold: lowStockThreshold,
        products: lowStockProducts.map((product) => ({ id: product._id.toString(), name: product.name })),
      },
    });
  }
}

async function findLowStockProducts(threshold: number): Promise<Array<{ _id: string; name: string }>> {
  const now = new Date();
  const activeBlocks = await MaintenanceBlock.find({ start_date: { $lte: now }, end_date: { $gt: now } })
    .select("product_id selected_size").lean();
  const activeBlockKeys = new Set(activeBlocks.map((block) => `${block.product_id.toString()}:${block.selected_size}`));
  const products = await Product.find({ "variants.stock": { $lte: threshold } }).select("_id name variants").limit(100).lean();
  return products
    .filter((product) => product.variants.some((variant) =>
      variant.stock <= threshold
      && !variant.in_maintenance
      && !activeBlockKeys.has(`${String(product._id)}:${variant.size}`),
    ))
    .slice(0, 20)
    .map((product) => ({ _id: String(product._id), name: product.name }));
}
