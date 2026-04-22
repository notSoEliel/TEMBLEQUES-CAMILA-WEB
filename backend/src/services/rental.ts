import { Product } from "../models/Product.js";
import { Rental, type RentalStatus } from "../models/Rental.js";
import { TermsAcceptance } from "../models/TermsAcceptance.js";
import { checkAvailability } from "./availability.js";

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
    throw new Error("Debe aceptar los terminos y condiciones para continuar.");
  }

  if (startDate >= endDate) {
    throw new Error("La fecha de inicio debe ser anterior a la fecha de fin.");
  }

  if (startDate < new Date()) {
    throw new Error("La fecha de inicio no puede ser en el pasado.");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Producto no encontrado.");
  }

  if (product.condition_status !== "disponible") {
    throw new Error("Este producto no esta disponible para alquiler.");
  }

  const isAvailable = await checkAvailability(productId, startDate, endDate);
  if (!isAvailable) {
    throw new Error("El producto no esta disponible para las fechas seleccionadas.");
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
    throw new Error("Reserva no encontrada.");
  }

  const allowed = validTransitions[rental.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`No se puede cambiar de '${rental.status}' a '${newStatus}'.`);
  }

  rental.status = newStatus;
  if (newStatus === "paid") {
    rental.payment_status = "completed";
  }
  await rental.save();

  return rental;
}
