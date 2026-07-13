import { SystemAlert, type AlertSeverity, type ISystemAlert } from "../models/SystemAlert.js";
import { Product } from "../models/Product.js";
import { Rental } from "../models/Rental.js";
import { sanitizeAuditMetadata } from "./audit.js";

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
  const [failedPayments, lateRentals, lowStockProducts] = await Promise.all([
    Rental.countDocuments({ payment_status: "failed", updatedAt: { $gte: since } }),
    Rental.countDocuments({ status: "late" }),
    Product.find({
      variants: { $elemMatch: { stock: { $lte: 1 }, in_maintenance: false } },
    }).select("_id name").limit(20).lean(),
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
        products: lowStockProducts.map((product) => ({ id: product._id.toString(), name: product.name })),
      },
    });
  }
}
