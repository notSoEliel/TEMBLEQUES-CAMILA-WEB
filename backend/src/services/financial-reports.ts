import PDFDocument from "pdfkit";
import { Rental } from "../models/Rental.js";
import { AppError } from "../lib/errors.js";

type FinancialRental = {
  _id: { toString(): string };
  product_id: { name?: string };
  total: number;
  discount_amount?: number;
  payment_status: string;
  payment_type: "reservation" | "full";
  stripe_payment_amount?: number;
  createdAt: Date;
};

export interface FinancialFilters { from?: Date; to?: Date; }

function amount(rental: FinancialRental): number {
  return rental.stripe_payment_amount ?? (rental.payment_type === "full" ? Math.max(0, rental.total - (rental.discount_amount ?? 0)) : 0);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "short", timeZone: "America/Panama" }).format(value);
}

async function findFinancialRentals(filters: FinancialFilters): Promise<FinancialRental[]> {
  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (filters.from) createdAt.$gte = filters.from;
  if (filters.to) createdAt.$lte = filters.to;
  const filter = Object.keys(createdAt).length > 0 ? { payment_status: { $in: ["completed", "refunded"] }, createdAt } : { payment_status: { $in: ["completed", "refunded"] } };
  return Rental.find(filter).populate("product_id", "name").sort({ createdAt: 1 }).lean<FinancialRental[]>();
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const result = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(result.getTime())) throw new AppError("El rango de fechas no es válido.", 400, "FINANCIAL_DATE_INVALID");
  return result;
}

export function parseFinancialFilters(query: { from?: string; to?: string }): FinancialFilters {
  const from = parseDate(query.from);
  const to = parseDate(query.to, true);
  if (from && to && from > to) throw new AppError("La fecha inicial debe ser anterior a la fecha final.", 400, "FINANCIAL_DATE_RANGE_INVALID");
  return { from, to };
}

export async function generateFinancialCsv(filters: FinancialFilters): Promise<string> {
  const rentals = await findFinancialRentals(filters);
  const lines = ["Reserva,Producto,Fecha,Subtotal (PAB),ITBMS (PAB),Total (PAB),Cobrado (PAB),Método,Estado"];
  for (const rental of rentals) {
    const subtotal = Math.round((rental.total / 1.07) * 100) / 100;
    const itbms = Math.round((rental.total - subtotal) * 100) / 100;
    lines.push([
      rental._id.toString(),
      rental.product_id.name ?? "Producto",
      formatDate(rental.createdAt),
      subtotal.toFixed(2),
      itbms.toFixed(2),
      rental.total.toFixed(2),
      amount(rental).toFixed(2),
      "Stripe Checkout",
      rental.payment_status,
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  }
  lines.push("");
  lines.push('"Nota","Reporte académico y operativo; no es factura fiscal electrónica ni integra la DGI."');
  return `${lines.join("\n")}\n`;
}

export async function generateFinancialPdf(filters: FinancialFilters): Promise<Buffer> {
  const rentals = await findFinancialRentals(filters);
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Helvetica-Bold").fontSize(18).text("Tembleques Camila", { align: "center" });
    doc.font("Helvetica").fontSize(13).text("Reporte financiero académico", { align: "center" });
    doc.moveDown();
    doc.fontSize(9).text(`Registros: ${rentals.length}`);
    doc.moveDown();
    for (const rental of rentals) {
      const subtotal = Math.round((rental.total / 1.07) * 100) / 100;
      const itbms = Math.round((rental.total - subtotal) * 100) / 100;
      doc.font("Helvetica-Bold").text(`${rental._id.toString()} — ${rental.product_id.name ?? "Producto"}`);
      doc.font("Helvetica").text(`${formatDate(rental.createdAt)} | Subtotal ${subtotal.toFixed(2)} PAB | ITBMS ${itbms.toFixed(2)} PAB | Total ${rental.total.toFixed(2)} PAB | Cobrado ${amount(rental).toFixed(2)} PAB | ${rental.payment_status}`);
      doc.moveDown(0.4);
    }
    doc.moveDown();
    doc.fontSize(8).fillColor("gray").text("Límite académico: este reporte no es una factura fiscal electrónica y no sustituye una integración con la DGI.", { align: "justify" });
    doc.end();
  });
}
