import { Product } from "../models/Product.js";
import { Rental, type RentalStatus } from "../models/Rental.js";
import { TermsAcceptance } from "../models/TermsAcceptance.js";
import { checkAvailability } from "./availability.js";
import { AppError } from "../lib/errors.js";
import {
  calculateLateDays,
  calculateLateFeeAmount,
  calculateRentalDays,
  evaluateDeposit,
} from "./payment-rules.js";
import {
  captureDepositForDamage,
  chargeLateFee,
  isStripeConfigured,
  releaseDepositHold,
} from "./stripe.js";

/**
 * Calculates the total rental cost based on price per day and the date range.
 */
export function calculateTotal(pricePerDay: number, startDate: Date, endDate: Date): number {
  const days = calculateRentalDays(startDate, endDate);
  return pricePerDay * days;
}

/**
 * Creates a rental after validating availability and terms.
 */
export async function createRental(params: {
  userId: string;
  productId: string;
  selectedSize: string;
  startDate: Date;
  endDate: Date;
  termsAccepted: boolean;
  ipAddress: string;
  userAgent: string;
}) {
  const { userId, productId, selectedSize, startDate, endDate, termsAccepted, ipAddress, userAgent } = params;

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

  // Validate the selected size variant exists and is available
  const variant = product.variants.find((v) => v.size === selectedSize);
  if (!variant) {
    throw new AppError(
      `La talla "${selectedSize}" no está disponible para este producto.`,
      400,
      "VARIANT_NOT_FOUND",
    );
  }

  if (variant.in_maintenance) {
    throw new AppError(
      `La talla "${selectedSize}" está en mantenimiento y no se puede alquilar.`,
      409,
      "VARIANT_IN_MAINTENANCE",
    );
  }

  if (variant.stock <= 0) {
    throw new AppError(
      `La talla "${selectedSize}" no tiene stock disponible.`,
      409,
      "VARIANT_NO_STOCK",
    );
  }

  const isAvailable = await checkAvailability(productId, startDate, endDate, selectedSize);
  if (!isAvailable) {
    throw new AppError(
      "El producto no está disponible para las fechas seleccionadas en la talla elegida.",
      409,
      "PRODUCT_DATES_UNAVAILABLE",
    );
  }

  // Use variant price_override if set, otherwise fall back to product base price
  const pricePerDay = variant.price_override ?? product.rental_price;
  const total = calculateTotal(pricePerDay, startDate, endDate);
  const deposit = evaluateDeposit(total, product.deposit_settings);

  const rental = await Rental.create({
    user_id: userId,
    product_id: productId,
    selected_size: selectedSize,
    start_date: startDate,
    end_date: endDate,
    total,
    status: "pending",
    payment_status: "pending",
    terms_accepted: true,
    deposit_required: deposit.required,
    deposit_amount: deposit.amount,
    deposit_status: deposit.required ? "pending_hold" : "not_required",
    late_days: 0,
    late_fee_amount: 0,
    late_fee_status: "not_applicable",
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

  if (newStatus === "late") {
    const lateDays = calculateLateDays(rental.end_date);
    const lateFee = calculateLateFeeAmount({
      total: rental.total,
      startDate: rental.start_date,
      endDate: rental.end_date,
      lateDays,
    });

    rental.late_days = lateDays;
    rental.late_fee_amount = lateFee;
    rental.late_fee_status = lateFee > 0 ? "pending" : "not_applicable";
    rental.late_fee_failure_reason = undefined;
  }

  await rental.save();

  if (newStatus === "late" && rental.late_fee_amount > 0) {
    if (!isStripeConfigured()) {
      rental.late_fee_status = "charged";
      await rental.save();
      return rental;
    }

    try {
      await chargeLateFee(rental);
      rental.late_fee_status = "charged";
      rental.late_fee_failure_reason = undefined;
    } catch (error: any) {
      rental.late_fee_status = "failed";
      rental.late_fee_failure_reason = error?.message || "No se pudo cobrar la penalidad por atraso.";
    }
    await rental.save();
  }

  if (newStatus === "returned" && rental.deposit_status === "held") {
    if (!isStripeConfigured()) {
      rental.deposit_status = "released";
      rental.deposit_failure_reason = undefined;
      await rental.save();
      return rental;
    }

    try {
      await releaseDepositHold(rental);
      rental.deposit_status = "released";
      rental.deposit_failure_reason = undefined;
    } catch (error: any) {
      rental.deposit_status = "failed";
      rental.deposit_failure_reason = error?.message || "No se pudo liberar el depósito de garantía.";
    }
    await rental.save();
  }

  if (newStatus === "damaged" && rental.deposit_required && rental.deposit_amount > 0) {
    if (!isStripeConfigured()) {
      rental.deposit_status = "captured";
      rental.deposit_failure_reason = undefined;
      await rental.save();
      return rental;
    }

    try {
      await captureDepositForDamage(rental);
      rental.deposit_status = "captured";
      rental.deposit_failure_reason = undefined;
    } catch (error: any) {
      rental.deposit_status = "failed";
      rental.deposit_failure_reason = error?.message || "No se pudo cobrar el depósito por daños.";
    }
    await rental.save();
  }

  return rental;
}
