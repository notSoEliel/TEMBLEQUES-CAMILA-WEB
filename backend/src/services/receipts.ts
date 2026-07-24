import PDFDocument from "pdfkit";
import { Rental } from "../models/Rental.js";
import { AppError } from "../lib/errors.js";

type ReceiptRental = {
  _id: { toString(): string };
  user_id: { toString(): string; name?: string; email?: string };
  product_id: { name?: string };
  selected_size: string;
  start_date: Date;
  end_date: Date;
  total: number;
  discount_amount?: number;
  payment_type: "reservation" | "full";
  payment_status: string;
  stripe_payment_amount?: number;
  createdAt: Date;
};

function currency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "PAB" }).format(amount);
}

function date(value: Date): string {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "long", timeZone: "America/Panama" }).format(value);
}

function addLine(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value);
}

export async function generatePaymentReceiptPdf(rentalId: string, userId: string): Promise<Buffer> {
  const rental = await Rental.findOne({ _id: rentalId, user_id: userId })
    .populate("user_id", "name email")
    .populate("product_id", "name")
    .lean<ReceiptRental>();

  if (!rental) throw new AppError("Comprobante no encontrado.", 404, "RECEIPT_NOT_FOUND");
  if (!["completed", "refunded"].includes(rental.payment_status)) {
    throw new AppError("El comprobante estará disponible después de confirmar el pago.", 409, "RECEIPT_PAYMENT_NOT_CONFIRMED");
  }

  const subtotal = Math.round((rental.total / 1.07) * 100) / 100;
  const itbms = Math.round((rental.total - subtotal) * 100) / 100;
  const paidAmount = rental.stripe_payment_amount ?? (rental.payment_type === "full"
    ? Math.max(0, rental.total - (rental.discount_amount ?? 0))
    : 0);
  const receiptNumber = `TC-${rental.createdAt.getUTCFullYear()}-${rental._id.toString().slice(-8).toUpperCase()}`;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).text("Tembleques Camila", { align: "center" });
    doc.font("Helvetica").fontSize(14).text("Comprobante de pago", { align: "center" });
    doc.moveDown();
    doc.fontSize(10);
    addLine(doc, "Comprobante", receiptNumber);
    addLine(doc, "Fecha", date(rental.createdAt));
    addLine(doc, "Cliente", rental.user_id.name ?? "No registrado");
    addLine(doc, "Correo", rental.user_id.email ?? "No registrado");
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text("Detalle de la reserva");
    doc.font("Helvetica").fontSize(10);
    addLine(doc, "Producto", rental.product_id.name ?? "Producto");
    addLine(doc, "Talla", rental.selected_size);
    addLine(doc, "Periodo", `${date(rental.start_date)} al ${date(rental.end_date)}`);
    addLine(doc, "Modalidad", rental.payment_type === "full" ? "Pago completo" : "Abono de reserva");
    addLine(doc, "Método", "Stripe Checkout (tarjeta de prueba en entornos no productivos)");
    addLine(doc, "Estado", rental.payment_status === "refunded" ? "Reembolsado" : "Pagado");
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text("Resumen financiero");
    doc.font("Helvetica").fontSize(10);
    addLine(doc, "Subtotal", currency(subtotal));
    addLine(doc, "ITBMS", currency(itbms));
    addLine(doc, "Total de la reserva", currency(rental.total));
    addLine(doc, "Importe cobrado", currency(paidAmount));
    doc.moveDown(2);
    doc.fontSize(8).fillColor("gray").text(
      "Este comprobante es una constancia académica y operativa del pago. No constituye una factura fiscal electrónica ni sustituye la integración requerida por la DGI.",
      { align: "justify" },
    );
    doc.end();
  });
}
