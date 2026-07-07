import { Hono } from "hono";
import { authMiddleware, requireAdmin, type AuthVariables } from "../middleware/auth.js";
import { Rental } from "../models/Rental.js";
import { Product } from "../models/Product.js";
import { calculateRentalDays } from "../services/payment-rules.js";

const reports = new Hono<{ Variables: AuthVariables }>();

reports.use("/*", authMiddleware, requireAdmin);

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

export default reports;
