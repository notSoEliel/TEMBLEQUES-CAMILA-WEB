import { Hono } from "hono";
import { authMiddleware, requirePermission, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import { calculateRentalDays } from "../services/payment-rules.js";
import { generateFinancialCsv, generateFinancialPdf, parseFinancialFilters } from "../services/financial-reports.js";

const reports = new Hono<{ Variables: AuthVariables }>();

reports.use("/*", authMiddleware, requirePermission("reports.read"));

reports.get("/inventory-stats", async (c) => {
  const [products, rentals] = await Promise.all([
    Product.find(),
    Rental.find({ status: { $ne: "cancelled" } }),
  ]);

  const stats = [];

  for (const product of products) {
    for (const variant of product.variants) {
      const variantRentals = rentals.filter(
        (r) => r.product_id.toString() === product._id.toString() && r.selected_size === variant.size
      );

      const totalRentalsCount = variantRentals.length;
      let totalDaysRented = 0;
      let totalRevenue = 0;

      for (const r of variantRentals) {
        const days = calculateRentalDays(r.start_date, r.end_date);
        totalDaysRented += days;
        if (["paid", "confirmed", "delivered", "returned", "late", "damaged"].includes(r.status)) {
          totalRevenue += r.total;
        }
      }

      stats.push({
        productId: product._id,
        name: product.name,
        size: variant.size,
        stock: variant.stock,
        inMaintenance: variant.in_maintenance,
        rentalsCount: totalRentalsCount,
        totalDaysRented,
        totalRevenue,
      });
    }
  }

  return c.json({ stats });
});

reports.get("/export-csv", async (c) => {
  const [products, rentals] = await Promise.all([
    Product.find(),
    Rental.find({ status: { $ne: "cancelled" } }),
  ]);

  let csv = "Producto,Talla,Stock,En Mantenimiento,Cantidad Alquileres,Total Dias Alquilados,Ingresos Totales (PAB)\n";

  for (const product of products) {
    for (const variant of product.variants) {
      const variantRentals = rentals.filter(
        (r) => r.product_id.toString() === product._id.toString() && r.selected_size === variant.size
      );

      const totalRentalsCount = variantRentals.length;
      let totalDaysRented = 0;
      let totalRevenue = 0;

      for (const r of variantRentals) {
        const days = calculateRentalDays(r.start_date, r.end_date);
        totalDaysRented += days;
        if (["paid", "confirmed", "delivered", "returned", "late", "damaged"].includes(r.status)) {
          totalRevenue += r.total;
        }
      }

      csv += `"${product.name.replace(/"/g, '""')}","${variant.size}",${variant.stock},${variant.in_maintenance ? "Si" : "No"},${totalRentalsCount},${totalDaysRented},${totalRevenue.toFixed(2)}\n`;
    }
  }

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
