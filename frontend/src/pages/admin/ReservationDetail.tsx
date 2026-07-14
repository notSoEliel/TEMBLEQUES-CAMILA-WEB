import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, FileText, RefreshCw, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type AdminRentalDetail, type RentalTermsAcceptance } from "@/services/api";
import { useErrorModal } from "@/components/ErrorModal";
import { RequestState } from "@/components/ui/RequestState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", reserved: "Reservada", paid: "Pagada", confirmed: "Confirmada",
  delivered: "Entregada", returned: "Devuelta", late: "Atrasada", damaged: "Dañada",
  cancelled: "Cancelada", expired: "Expirada", refunded: "Reembolsada",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pendiente", completed: "Completado", failed: "Fallido", expired: "Expirado",
  cancelled: "Cancelado", refunded: "Reembolsado",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-PA", { timeZone: "UTC", dateStyle: "long" });
}

export default function AdminReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, getToken } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const [rental, setRental] = useState<AdminRentalDetail | null>(null);
  const [terms, setTerms] = useState<RentalTermsAcceptance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const freshToken = await getToken();
      const response = await adminApi.rentalDetail(id, freshToken || token);
      setRental(response.rental);
      setTerms(response.terms);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo cargar el expediente.", "generic");
    } finally {
      setLoading(false);
    }
  }, [getToken, id, showError, token]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  if (loading) {
    return <div className="min-h-56 animate-pulse rounded-[var(--radius)] border bg-muted/30 p-8"><div className="mx-auto h-8 max-w-sm rounded bg-muted" /><div className="mx-auto mt-4 h-4 max-w-xl rounded bg-muted" /></div>;
  }

  if (!rental) {
    return <>{errorModal}<RequestState title="No se encontró la reserva" message="La reserva puede haber sido eliminada o no tienes permiso para consultarla." retryLabel="Reintentar" onRetry={() => void loadDetail()} /></>;
  }

  return (
    <div className="space-y-6">
      {errorModal}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0"><Link to="/admin/reservations"><ArrowLeft className="mr-2 h-4 w-4" />Volver a reservas</Link></Button>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Expediente de reserva</h1>
          <p className="mt-1 text-muted-foreground">Referencia: {rental._id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Reserva: {STATUS_LABELS[rental.status] || rental.status}</Badge>
          <Badge variant={rental.payment_status === "completed" ? "default" : "secondary"}>Pago: {PAYMENT_LABELS[rental.payment_status] || rental.payment_status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Cliente y producto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Cliente</p><p className="font-semibold">{rental.user_id.name}</p><p className="text-sm">{rental.user_id.email}</p>{rental.user_id.phone && <p className="text-sm">{rental.user_id.phone}</p>}</div>
            <Separator />
            <div><p className="text-sm text-muted-foreground">Producto y talla</p><p className="font-semibold">{rental.product_id.name}</p><p className="text-sm">Talla: {rental.selected_size}</p></div>
            <div className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" />{formatDate(rental.start_date)} — {formatDate(rental.end_date)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Resumen financiero</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span>Total</span><strong>{formatCurrency(rental.total)}</strong></div>
            <div className="flex justify-between"><span>Saldo pendiente</span><strong>{formatCurrency(rental.balance_due)}</strong></div>
            <div className="flex justify-between"><span>Depósito</span><span>{rental.deposit_required ? `${formatCurrency(rental.deposit_amount)} (${rental.deposit_status})` : "No requerido"}</span></div>
            {rental.late_fee_amount > 0 && <div className="flex justify-between"><span>Mora</span><span>{formatCurrency(rental.late_fee_amount)} ({rental.late_fee_status})</span></div>}
            <Separator />
            <p className="text-xs text-muted-foreground">Los identificadores de Stripe se muestran únicamente para conciliación; no se exponen datos de tarjetas ni métodos de pago.</p>
            {rental.payment.stripe_session_id && <p className="break-all text-xs">Checkout Session: {rental.payment.stripe_session_id}</p>}
            {rental.payment.stripe_payment_intent_id && <p className="break-all text-xs">PaymentIntent: {rental.payment.stripe_payment_intent_id}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Términos e historial</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div><p className="font-semibold">Aceptaciones registradas</p>{terms.length === 0 ? <p className="text-sm text-muted-foreground">No hay aceptación registrada para esta reserva.</p> : terms.map((term) => <div key={`${term.accepted_at}-${term.ip_address}`} className="mt-2 rounded-xl border p-3 text-sm"><p>{new Date(term.accepted_at).toLocaleString("es-PA")}</p><p className="text-muted-foreground">IP: {term.ip_address}</p><p className="text-muted-foreground">Agente: {term.user_agent}</p></div>)}</div>
          <Separator />
          <div className="space-y-3">{rental.status_history.map((entry) => <div key={`${entry.timestamp}-${entry.status}`} className="flex gap-3 text-sm"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="font-semibold">{STATUS_LABELS[entry.status] || entry.status}</p><p className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString("es-PA")}{entry.notes ? ` — ${entry.notes}` : ""}</p></div></div>)}</div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => void loadDetail()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar expediente</Button>
    </div>
  );
}
