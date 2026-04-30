import { Rental } from "../models/Rental.js";

/**
 * Starts background tasks (cron jobs) to keep the system clean.
 * This runs periodically to clean up hanging or abandoned rentals.
 */
export function startCronJobs() {
  console.log("🕒 Iniciando tareas en segundo plano (Cron Jobs)...");

  // Tarea 1: Limpiar reservas pendientes y abandonadas (cada 5 minutos)
  setInterval(async () => {
    try {
      await cleanAbandonedRentals();
    } catch (error) {
      console.error("❌ Error en cron job de limpieza de reservas:", error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Ejecutar inmediatamente al inicio
  cleanAbandonedRentals().catch(console.error);
}

/**
 * Finds rentals that have been "pending" for more than 35 minutes
 * and cancels them to free up the calendar availability.
 * Stripe will expire sessions at 30 mins, but this acts as a robust fallback.
 */
async function cleanAbandonedRentals() {
  const cutoffTime = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago

  const abandonedRentals = await Rental.find({
    status: "pending",
    createdAt: { $lt: cutoffTime },
  });

  if (abandonedRentals.length > 0) {
    console.log(`🧹 Limpiando ${abandonedRentals.length} reservas abandonadas...`);

    for (const rental of abandonedRentals) {
      rental.status = "cancelled";
      rental.payment_status = "failed";
      // Opcional: Podríamos guardar una nota de cancelación, pero con status=cancelled es suficiente
      await rental.save();
      console.log(`✅ Reserva ${rental._id} cancelada por inactividad.`);
    }
  }
}
