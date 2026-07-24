import PDFDocument from "pdfkit";
import { Rental } from "../models/Rental.js";
import { TermsAcceptance } from "../models/TermsAcceptance.js";
import { AppError } from "../lib/errors.js";

type PopulatedRental = {
  _id: { toString(): string };
  user_id: {
    name?: string;
    email?: string;
    phone?: string;
    preferredAddress?: string;
  };
  product_id: {
    name?: string;
    category?: string[];
  };
  order_group_id?: string;
  selected_size: string;
  start_date: Date;
  end_date: Date;
  total: number;
  balance_due: number;
  payment_type: "reservation" | "full";
  status: string;
  payment_status: string;
  terms_accepted: boolean;
  deposit_required: boolean;
  deposit_amount: number;
  createdAt: Date;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "PAB",
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Panama",
  }).format(date);
}

function addKeyValue(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value || "No registrado");
}

export async function generateRentalContractPdf(rentalId: string): Promise<Buffer> {
  const rental = await Rental.findById(rentalId)
    .populate("user_id", "name email phone preferredAddress")
    .populate("product_id", "name category")
    .lean<PopulatedRental>();

  if (!rental) {
    throw new AppError("Reserva no encontrada", 404, "RENTAL_NOT_FOUND");
  }

  const terms = await TermsAcceptance.findOne({ rental_id: rental._id })
    .sort({ accepted_at: -1 })
    .lean();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).text("Tembleques Camila", { align: "center" });
    doc.fontSize(14).text("Contrato Manual de Alquiler", { align: "center" });
    doc.moveDown(1.25);

    doc.font("Helvetica").fontSize(10).text(
      "Documento generado para uso operativo en tienda física. Resume la reserva, la aceptación digital de términos y las condiciones básicas de retiro y devolución.",
      { align: "justify" },
    );
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(13).text("1. Datos del Cliente");
    doc.moveDown(0.35);
    doc.fontSize(10);
    addKeyValue(doc, "Nombre", rental.user_id.name ?? "");
    addKeyValue(doc, "Correo", rental.user_id.email ?? "");
    addKeyValue(doc, "Teléfono", rental.user_id.phone ?? "");
    addKeyValue(doc, "Dirección preferida", rental.user_id.preferredAddress ?? "");
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(13).text("2. Detalle de la Reserva");
    doc.moveDown(0.35);
    doc.fontSize(10);
    addKeyValue(doc, "Reserva", rental._id.toString());
    addKeyValue(doc, "Pedido", rental.order_group_id ?? rental._id.toString());
    addKeyValue(doc, "Producto", rental.product_id.name ?? "Producto");
    addKeyValue(doc, "Categoría", rental.product_id.category?.join(", ") ?? "No registrada");
    addKeyValue(doc, "Talla", rental.selected_size);
    addKeyValue(doc, "Periodo", `${formatDate(rental.start_date)} al ${formatDate(rental.end_date)}`);
    addKeyValue(doc, "Estado operativo", rental.status);
    addKeyValue(doc, "Estado de pago", rental.payment_status);
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(13).text("3. Resumen Financiero");
    doc.moveDown(0.35);
    doc.fontSize(10);
    addKeyValue(doc, "Modalidad", rental.payment_type === "full" ? "Pago completo" : "Abono de reserva");
    addKeyValue(doc, "Total", formatCurrency(rental.total));
    addKeyValue(doc, "Saldo pendiente en tienda", formatCurrency(rental.balance_due));
    addKeyValue(doc, "Depósito de garantía", rental.deposit_required ? formatCurrency(rental.deposit_amount) : "No requerido");
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(13).text("4. Aceptación Digital de Términos");
    doc.moveDown(0.35);
    doc.fontSize(10);
    addKeyValue(doc, "Términos aceptados", rental.terms_accepted ? "Sí" : "No");
    addKeyValue(doc, "Fecha de aceptación", terms?.accepted_at ? formatDate(terms.accepted_at) : "No registrada");
    addKeyValue(doc, "IP registrada", terms?.ip_address ?? "");
    addKeyValue(doc, "Navegador", terms?.user_agent ?? "");
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(13).text("5. Condiciones Operativas");
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(10).list([
      "El cliente se compromete a devolver cada pieza en la misma condición en que fue entregada.",
      "Daños, pérdida de piezas, manchas permanentes o retrasos pueden generar cargos adicionales según evaluación del equipo de Tembleques Camila.",
      "El saldo pendiente, si existe, debe cancelarse antes o durante la entrega física de la vestimenta.",
      "Este documento debe acompañar la revisión física de entrega y devolución en tienda.",
    ], { bulletRadius: 1.5, textIndent: 12 });
    doc.moveDown(2);

    doc.text("Firma del cliente: ________________________________", { continued: false });
    doc.moveDown();
    doc.text("Firma autorizada: ________________________________");
    doc.moveDown(1.5);
    doc.fontSize(8).fillColor("gray").text(
      `Generado el ${formatDate(new Date())}. Moneda expresada en Balboas (PAB).`,
      { align: "center" },
    );

    doc.end();
  });
}
