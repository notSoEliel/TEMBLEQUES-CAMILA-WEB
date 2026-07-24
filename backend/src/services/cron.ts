import { Rental } from "../models/Rental.js";
import { structuredLog } from "./observability.js";
import { User } from "../models/User.js";
import { dispatchNotification } from "./notifications.js";

let lastRunAt: string | undefined;
let lastSuccessAt: string | undefined;
let lastError: string | undefined;

/**
 * Starts background tasks (cron jobs) to keep the system clean.
 * This runs periodically to clean up hanging or abandoned rentals.
 */
export function startCronJobs() {
  structuredLog("info", "cron.started", { job: "clean_abandoned_rentals", intervalMinutes: 5 });

  // Tarea 1: Limpiar reservas pendientes y abandonadas (cada 5 minutos)
  setInterval(async () => {
    try {
      await cleanAbandonedRentals();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      structuredLog("error", "cron.failed", { job: "clean_abandoned_rentals", error: lastError });
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Ejecutar inmediatamente al inicio
  cleanAbandonedRentals().catch((error: unknown) => {
    lastError = error instanceof Error ? error.message : String(error);
    structuredLog("error", "cron.failed", { job: "clean_abandoned_rentals", error: lastError });
  });
}

export function getCronStatus(): { job: string; lastRunAt?: string; lastSuccessAt?: string; lastError?: string } {
  return { job: "clean_abandoned_rentals", lastRunAt, lastSuccessAt, lastError };
}

export function getAbandonedRentalCutoff(now = new Date()): Date {
  return new Date(now.getTime() - 35 * 60 * 1000);
}

export function getAbandonedPaymentStatus(stripeSessionId?: string): "expired" | "cancelled" {
  return stripeSessionId ? "expired" : "cancelled";
}

/**
 * Finds rentals that have been "pending" for more than 35 minutes
 * and cancels them to free up the calendar availability.
 * Stripe will expire sessions at 30 mins, but this acts as a robust fallback.
 */
async function cleanAbandonedRentals() {
  lastRunAt = new Date().toISOString();
  const cutoffTime = getAbandonedRentalCutoff();

  const abandonedRentals = await Rental.find({
    status: "pending",
    createdAt: { $lt: cutoffTime },
  });

  if (abandonedRentals.length > 0) {
    structuredLog("info", "cron.abandoned_rentals_found", { count: abandonedRentals.length });

    for (const rental of abandonedRentals) {
      rental.status = "cancelled";
      rental.payment_status = getAbandonedPaymentStatus(rental.stripe_session_id);
      rental.deposit_status = rental.deposit_required ? "not_required" : rental.deposit_status;
      await rental.save();
      void User.findById(rental.user_id).select("email").lean()
        .then((user) => dispatchNotification({
          userId: rental.user_id.toString(),
          email: user?.email,
          type: "payment_expired",
          title: "Reserva pendiente expirada",
          message: "La reserva pendiente superó el tiempo permitido y fue liberada automáticamente.",
          idempotencyKey: `cron:payment-expired:${rental._id.toString()}`,
          metadata: { rentalId: rental._id.toString() },
        }))
        .catch((error: unknown) => {
          structuredLog("error", "notification.dispatch_failed", {
            source: "cron.clean_abandoned_rentals",
            rentalId: rental._id.toString(),
            type: "payment_expired",
            errorCode: error instanceof Error ? error.name : "NOTIFICATION_DISPATCH_FAILED",
          });
        });
      structuredLog("info", "rental.cancelled_by_cron", { rentalId: rental._id.toString() });
    }
  }
  lastSuccessAt = new Date().toISOString();
}
