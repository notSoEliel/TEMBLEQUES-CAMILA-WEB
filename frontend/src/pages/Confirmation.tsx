import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { rentalsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, ArrowRight, Loader2 } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  paid:      "Pagado",
  pending:   "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  delivered: "Entregado",
  returned:  "Devuelto",
  damaged:   "Dañado",
  late:      "Atrasado",
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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rentalId, token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Verificando tu reserva…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Hero */}
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary mb-6">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          ¡Reserva Confirmada!
        </h1>
        <p className="text-muted-foreground">
          Tu reserva ha sido procesada exitosamente. Recibirás los detalles por correo electrónico.
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
            Sesión: {sessionId.slice(0, 24)}…
          </p>
        )}
      </div>

      {/* Rental details */}
      {rental ? (
        <Card className="text-left mb-8">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Detalles de la Reserva</h3>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Producto</p>
                <p className="font-medium">{rental.product_id?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Estado</p>
                <p className="font-medium">{STATUS_LABELS[rental.status] ?? rental.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Fecha Inicio</p>
                <p className="font-medium">{new Date(rental.start_date).toLocaleDateString("es-PA")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Fecha Devolución</p>
                <p className="font-medium">{new Date(rental.end_date).toLocaleDateString("es-PA")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Total Pagado</p>
                <p className="font-bold text-primary text-lg">{formatCurrency(rental.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">ID Reserva</p>
                <p className="font-mono text-xs text-muted-foreground break-all">{rental._id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              Los detalles estarán disponibles en unos instantes mientras procesamos tu confirmación.
            </p>
          </CardContent>
        </Card>
      )}

      {/* What's next */}
      <Card className="text-left mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">¿Qué sigue?</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">01</span>Recibirás un correo de confirmación con todos los detalles.</li>
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">02</span>Nuestro equipo preparará el artículo para la fecha acordada.</li>
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">03</span>Recoge el artículo en nuestro local o coordina la entrega.</li>
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">04</span>Devuélvelo antes de la fecha de devolución para evitar cargos adicionales.</li>
          </ol>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild>
          <Link to="/profile">
            <Calendar className="h-4 w-4 mr-2" />
            Ver Mis Reservas
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/catalog">
            Seguir Explorando
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
