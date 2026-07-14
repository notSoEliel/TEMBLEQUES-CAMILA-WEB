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
  getMinimumRentalStartDate,
  getPanamaTodayUTC,
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
export function calculateTotal(
  pricePerDay: number,
  startDate: Date,
  endDate: Date,
): number {
  const days = calculateRentalDays(startDate, endDate);
  const subtotal = pricePerDay * days;
  const itbms = subtotal * 0.07;
  return subtotal + itbms;
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
  paymentType: "reservation" | "full";
  orderGroupId: string;
  ipAddress: string;
  userAgent: string;
}) {
  const {
    userId,
    productId,
    selectedSize,
    startDate,
    endDate,
    termsAccepted,
    paymentType,
    orderGroupId,
    ipAddress,
    userAgent,
  } = params;

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

  const minAllowedDate = getMinimumRentalStartDate();
  const panamaTime = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const isPast6pm = panamaTime.getUTCHours() >= 18;

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

  const isAvailable = await checkAvailability(
    productId,
    startDate,
    endDate,
    selectedSize,
  );
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
    order_group_id: orderGroupId,
    selected_size: selectedSize,
    start_date: startDate,
    end_date: endDate,
    total,
    balance_due: paymentType === "full" ? 0 : total - deposit.amount,
    payment_type: paymentType,
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
  reserved: "Abonado - Pendiente de Saldo",
  paid: "Pagado Totalmente",
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
export async function updateRentalStatus(
  rentalId: string,
  newStatus: RentalStatus,
) {
  const validTransitions: Record<string, string[]> = {
    // paid solo lo confirma un webhook válido de Stripe. reserved puede
    // representar una gestión operativa sin convertir el pago en completed.
    pending: ["reserved", "cancelled"],
    reserved: ["delivered", "cancelled"],
    paid: ["confirmed", "delivered", "cancelled"],
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

  // REGLA: Bloquear "Dañado", "Devuelto" o "Atrasado" si es demasiado pronto.
  // Se permite entregar un día antes de la fecha pactada.
  const today = getPanamaTodayUTC();
  const allowReturnDate = new Date(rental.end_date);
  allowReturnDate.setUTCDate(allowReturnDate.getUTCDate() - 1);

  if (["damaged", "returned", "late"].includes(newStatus)) {
    if (allowReturnDate > today) {
       const d = new Date(allowReturnDate);
       const formattedDate = isNaN(d.getTime()) ? "la fecha pactada" : d.toLocaleDateString("es-PA");
       throw new AppError(
         `No se puede marcar como "${STATUS_LABELS[newStatus]}" antes de la fecha permitida (${formattedDate}).`,
         400,
         "RENTAL_DATE_NOT_REACHED"
       );
    }
  }

  rental.status = newStatus;


  // Si se pasa a entregado, la deuda se cancela automáticamente
  if (newStatus === "delivered" && rental.balance_due > 0) {
    rental.balance_due = 0;
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
    } catch (error: unknown) {
      rental.late_fee_status = "failed";
      rental.late_fee_failure_reason =
        error instanceof Error ? error.message : "No se pudo cobrar la penalidad por atraso.";
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
      rental.deposit_failure_reason =
        error?.message || "No se pudo liberar el depósito de garantía.";
    }
    await rental.save();
  }

  if (
    newStatus === "damaged" &&
    rental.deposit_required &&
    rental.deposit_amount > 0
  ) {
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
      rental.deposit_failure_reason =
        error?.message || "No se pudo cobrar el depósito por daños.";
    }
    await rental.save();
  }

  return rental;
}
