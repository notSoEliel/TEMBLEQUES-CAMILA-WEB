import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { rentalsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ArrowRight, Loader2 } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string }> = {
  paid:      { label: "Pagado",     bg: "bg-green-100",  border: "border-green-600" },
  pending:   { label: "Pendiente",  bg: "bg-yellow-100", border: "border-yellow-600" },
  confirmed: { label: "Confirmado", bg: "bg-blue-100",   border: "border-blue-600" },
  cancelled: { label: "Cancelado",  bg: "bg-red-100",    border: "border-red-600" },
  delivered: { label: "Entregado",  bg: "bg-purple-100", border: "border-purple-600" },
};

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const rentalId  = searchParams.get("rental");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!rentalId || !token) { setLoading(false); return; }
    rentalsApi
      .get(rentalId, token)
      .then((data) => setRental(data.rental))
      .catch(() => {/* rental not found or no token yet */})
      .finally(() => setLoading(false));
  }, [rentalId, token]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
        <p className="font-bold text-black/50">Verificando tu reserva…</p>
      </div>
    );
  }

  const status       = rental?.status ?? "paid";
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG["paid"];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        {/* Animated checkmark circle */}
        <div
          className="w-24 h-24 mx-auto border-[5px] border-black bg-[var(--primary)] flex items-center justify-center mb-6 shadow-[6px_6px_0px_0px_#000]"
          style={{ animation: "popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both" }}
        >
          <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
            <path
              d="M8 25l12 12L40 12"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-bold mb-3 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          ¡Reserva Confirmada!
        </h1>

        <p className="text-black/60 text-base max-w-md mx-auto">
          Tu reserva ha sido procesada exitosamente. A continuación encontrarás todos los detalles.
        </p>

        {sessionId && (
          <p className="mt-2 text-xs text-black/40 font-mono">
            ID de sesión: {sessionId.slice(0, 24)}…
          </p>
        )}
      </div>

      {/* ── Reservation details card ────────────────────────────────────────── */}
      {rental ? (
        <div className="border-[3px] border-black shadow-[6px_6px_0px_0px_#000] bg-white mb-8">
          {/* Header */}
          <div className="bg-[#F5F0E8] border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
            <h2
              className="font-bold text-lg"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Detalles de la Reserva
            </h2>
            <span
              className={`text-xs font-black uppercase px-3 py-1 border-[2px] ${statusConfig.bg} ${statusConfig.border}`}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="p-6">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <dt className="text-xs font-bold uppercase text-black/50 mb-0.5">Producto</dt>
                <dd className="font-bold">{rental.product_id?.name ?? "—"}</dd>
              </div>

              {rental.product_id?.size && (
                <div>
                  <dt className="text-xs font-bold uppercase text-black/50 mb-0.5">Talla</dt>
                  <dd className="font-bold">{rental.product_id.size}</dd>
                </div>
              )}

              <div>
                <dt className="text-xs font-bold uppercase text-black/50 mb-0.5">Inicio</dt>
                <dd className="font-bold">
                  {new Date(rental.start_date).toLocaleDateString("es-PA", {
                    weekday: "short", year: "numeric", month: "short", day: "numeric",
                  })}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-black/50 mb-0.5">Devolución</dt>
                <dd className="font-bold">
                  {new Date(rental.end_date).toLocaleDateString("es-PA", {
                    weekday: "short", year: "numeric", month: "short", day: "numeric",
                  })}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-black/50 mb-0.5">Pago</dt>
                <dd className="font-bold capitalize">{rental.payment_status}</dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-black/50 mb-0.5">ID de reserva</dt>
                <dd className="font-mono text-[11px] text-black/60 break-all">{rental._id}</dd>
              </div>
            </dl>

            {/* Total */}
            <div className="mt-6 pt-4 border-t-[3px] border-black flex justify-between items-center">
              <span
                className="font-black text-xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Total pagado
              </span>
              <span className="font-black text-3xl">{formatCurrency(rental.total)}</span>
            </div>
          </div>
        </div>
      ) : (
        /* No rental data yet (e.g., webhook still in-flight) */
        <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_#000] bg-[#F5F0E8] p-6 mb-8 text-center">
          <p className="font-bold text-black/60">
            Los detalles de la reserva estarán disponibles en unos instantes.
          </p>
          <p className="text-sm text-black/40 mt-1">
            Si acabas de pagar, el sistema está procesando tu confirmación.
          </p>
        </div>
      )}

      {/* ── Next steps info ─────────────────────────────────────────────────── */}
      <div className="border-[3px] border-black bg-[#F5F0E8] p-5 mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3">¿Qué sigue?</h3>
        <ol className="space-y-2 text-sm">
          <li className="flex gap-3">
            <span className="font-black text-[var(--primary)] shrink-0">01</span>
            Recibirás un correo de confirmación con los detalles.
          </li>
          <li className="flex gap-3">
            <span className="font-black text-[var(--primary)] shrink-0">02</span>
            Nuestro equipo preparará el artículo para la fecha acordada.
          </li>
          <li className="flex gap-3">
            <span className="font-black text-[var(--primary)] shrink-0">03</span>
            Recoge el artículo en nuestro local o coordina la entrega.
          </li>
          <li className="flex gap-3">
            <span className="font-black text-[var(--primary)] shrink-0">04</span>
            Devuélvelo antes de la fecha de devolución para evitar cargos adicionales.
          </li>
        </ol>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/profile"
          className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-bold py-3 border-[3px] border-black hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_var(--primary)] hover:shadow-none active:translate-y-[2px]"
        >
          <Calendar className="w-4 h-4" />
          Ver mis reservas
        </Link>
        <Link
          to="/catalog"
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-3 border-[3px] border-black hover:bg-black hover:text-white transition-colors active:translate-y-[2px]"
        >
          Seguir explorando
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Pop-in keyframe */}
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
