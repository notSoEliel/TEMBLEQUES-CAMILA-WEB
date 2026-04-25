import { Product } from "../models/Product.js";
import { Rental, type RentalStatus } from "../models/Rental.js";
import { TermsAcceptance } from "../models/TermsAcceptance.js";
import { checkAvailability } from "./availability.js";
import { AppError } from "../lib/errors.js";

/**
 * Calculates the total rental cost based on price per day and the date range.
 */
export function calculateTotal(pricePerDay: number, startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Minimum 1 day
  const days = Math.max(diffDays, 1);
  return pricePerDay * days;
}

/**
 * Creates a rental after validating availability and terms.
 */
export async function createRental(params: {
  userId: string;
  productId: string;
  startDate: Date;
  endDate: Date;
  termsAccepted: boolean;
  ipAddress: string;
  userAgent: string;
}) {
  const { userId, productId, startDate, endDate, termsAccepted, ipAddress, userAgent } = params;

  if (!termsAccepted) {
    throw new AppError(
      "Debe aceptar los términos y condiciones para continuar.",
      400,
      "RENTAL_TERMS_NOT_ACCEPTED",
    );
  }

  if (startDate >= endDate) {
    throw new AppError(
      "La fecha de inicio debe ser anterior a la fecha de fin.",
      400,
      "RENTAL_INVALID_DATE_RANGE",
    );
  }

  // Validar usando la zona horaria de Panamá (UTC-5)
  const now = new Date();
  const panamaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const panamaHour = panamaTime.getUTCHours();
  const panamaToday = new Date(Date.UTC(panamaTime.getUTCFullYear(), panamaTime.getUTCMonth(), panamaTime.getUTCDate()));

  const isPast6pm = panamaHour >= 18;
  const minAllowedDate = new Date(panamaToday.getTime());
  minAllowedDate.setUTCDate(minAllowedDate.getUTCDate() + (isPast6pm ? 2 : 1));

  if (startDate.getTime() < minAllowedDate.getTime()) {
    throw new AppError(
      isPast6pm 
        ? "Pasadas las 6:00 PM, las reservas deben hacerse con al menos dos días de anticipación."
        : "Las reservas deben hacerse con al menos un día de anticipación.",
      400,
      "RENTAL_DATE_TOO_SOON",
    );
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Producto no encontrado.", 404, "PRODUCT_NOT_FOUND");
  }

  if (product.condition_status !== "disponible") {
    throw new AppError(
      "Este producto no está disponible para alquiler en este momento.",
      409,
      "PRODUCT_NOT_AVAILABLE",
    );
  }

  const isAvailable = await checkAvailability(productId, startDate, endDate);
  if (!isAvailable) {
    throw new AppError(
      "El producto no está disponible para las fechas seleccionadas.",
      409,
      "PRODUCT_DATES_UNAVAILABLE",
    );
  }

  const total = calculateTotal(product.rental_price, startDate, endDate);

  const rental = await Rental.create({
    user_id: userId,
    product_id: productId,
    start_date: startDate,
    end_date: endDate,
    total,
    status: "pending",
    payment_status: "pending",
    terms_accepted: true,
  });

  // Record terms acceptance for audit trail
  await TermsAcceptance.create({
    user_id: userId,
    rental_id: rental._id,
    accepted_at: new Date(),
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return rental;
}

// Label map for status transitions — used in error messages
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  confirmed: "Confirmado",
  delivered: "Entregado",
  returned: "Devuelto",
  late: "Atrasado",
  damaged: "Dañado",
  cancelled: "Cancelado",
};

/**
 * Updates the status of a rental (admin action).
 */
export async function updateRentalStatus(rentalId: string, newStatus: RentalStatus) {
  const validTransitions: Record<string, string[]> = {
    pending: ["paid", "cancelled"],
    paid: ["confirmed", "cancelled"],
    confirmed: ["delivered", "cancelled"],
    delivered: ["returned", "late", "damaged"],
    late: ["returned", "damaged"],
    returned: [],
    damaged: [],
    cancelled: [],
  };

  const rental = await Rental.findById(rentalId);
  if (!rental) {
    throw new AppError("Reserva no encontrada.", 404, "RENTAL_NOT_FOUND");
  }

  const allowed = validTransitions[rental.status] || [];
  if (!allowed.includes(newStatus)) {
    const from = STATUS_LABELS[rental.status] ?? rental.status;
    const to = STATUS_LABELS[newStatus] ?? newStatus;
    throw new AppError(
      `No se puede cambiar el estado de "${from}" a "${to}".`,
      400,
      "RENTAL_INVALID_TRANSITION",
    );
  }

  rental.status = newStatus;
  if (newStatus === "paid") {
    rental.payment_status = "completed";
  }
  await rental.save();

  return rental;
}


