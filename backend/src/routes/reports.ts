import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import { calculateRentalDays } from "../services/payment-rules.js";
import { generateFinancialCsv, generateFinancialPdf, parseFinancialFilters } from "../services/financial-reports.js";
import { AppError } from "../lib/errors.js";

interface InventoryReportFilters {
  from?: Date;
  to?: Date;
  category?: string;
  productId?: string;
  search?: string;
}

function parseReportDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(date.getTime())) throw new AppError("El rango de fechas no es válido.", 400, "REPORT_DATE_INVALID");
  return date;
}

function getInventoryFilters(query: { from?: string; to?: string; category?: string; productId?: string; search?: string }): InventoryReportFilters {
  const from = parseReportDate(query.from);
  const to = parseReportDate(query.to, true);
  if (from && to && from > to) throw new AppError("La fecha inicial debe ser anterior a la fecha final.", 400, "REPORT_DATE_RANGE_INVALID");
  const productId = query.productId?.trim() || undefined;
  if (productId && !mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("El producto indicado no es válido.", 400, "REPORT_PRODUCT_INVALID");
  }
  return { from, to, category: query.category?.trim() || undefined, productId, search: query.search?.trim() || undefined };
}

async function buildInventoryStats(filters: InventoryReportFilters) {
  const productFilter: Record<string, unknown> = {};
  if (filters.category) productFilter.category = filters.category;
  if (filters.productId) productFilter._id = filters.productId;
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    productFilter.$or = [{ name: { $regex: escaped, $options: "i" } }, { name_en: { $regex: escaped, $options: "i" } }];
  }
  const rentalFilter: Record<string, unknown> = { status: { $ne: "cancelled" } };
  if (filters.from || filters.to) {
    rentalFilter.createdAt = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lte: filters.to } : {}) };
  }
  const [products, rentals] = await Promise.all([Product.find(productFilter), Rental.find(rentalFilter)]);
  const stats: Array<{ productId: unknown; name: string; size: string; stock: number; inMaintenance: boolean; rentalsCount: number; totalDaysRented: number; totalRevenue: number }> = [];

  for (const product of products) {
    for (const variant of product.variants) {
      const variantRentals = rentals.filter((r) => r.product_id.toString() === product._id.toString() && r.selected_size === variant.size);
      let totalDaysRented = 0;
      let totalRevenue = 0;
      for (const rental of variantRentals) {
        totalDaysRented += calculateRentalDays(rental.start_date, rental.end_date);
        if (["paid", "confirmed", "delivered", "returned", "late", "damaged"].includes(rental.status)) totalRevenue += rental.total;
      }
      stats.push({ productId: product._id, name: product.name, size: variant.size, stock: variant.stock, inMaintenance: variant.in_maintenance, rentalsCount: variantRentals.length, totalDaysRented, totalRevenue });
    }
  }
  return stats;
}

const reports = new Hono<{ Variables: AuthVariables }>();

reports.use("/*", authMiddleware, requirePermission("reports.read"));

reports.get("/inventory-stats", async (c) => {
  return c.json({ stats: await buildInventoryStats(getInventoryFilters({ from: c.req.query("from"), to: c.req.query("to"), category: c.req.query("category"), productId: c.req.query("productId"), search: c.req.query("search") })) });
});

reports.get("/export-csv", async (c) => {
  const stats = await buildInventoryStats(getInventoryFilters({ from: c.req.query("from"), to: c.req.query("to"), category: c.req.query("category"), productId: c.req.query("productId"), search: c.req.query("search") }));

  let csv = "Producto,Talla,Stock,En Mantenimiento,Cantidad Alquileres,Total Dias Alquilados,Ingresos Totales (PAB)\n";
  for (const stat of stats) csv += `"${stat.name.replace(/"/g, '""')}","${stat.size}",${stat.stock},${stat.inMaintenance ? "Si" : "No"},${stat.rentalsCount},${stat.totalDaysRented},${stat.totalRevenue.toFixed(2)}\n`;

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", "attachment; filename=reporte_rotacion_inventario.csv");
  return c.body(csv);
});

reports.get("/financial/export-csv", requirePermission("reports.fiscal"), async (c) => {
  const csv = await generateFinancialCsv(parseFinancialFilters({ from: c.req.query("from"), to: c.req.query("to") }));
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", "attachment; filename=reporte-financiero-academico.csv");
  return c.body(csv);
});

reports.get("/financial/export.pdf", requirePermission("reports.fiscal"), async (c) => {
  const pdf = await generateFinancialPdf(parseFinancialFilters({ from: c.req.query("from"), to: c.req.query("to") }));
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=reporte-financiero-academico.pdf",
      "Cache-Control": "no-store",
    },
  });
});

export default reports;
