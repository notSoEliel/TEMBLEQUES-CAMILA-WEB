import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { rentalsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, ArrowRight, Loader2 } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "PAB" }).format(amount);
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
    if (!token) return;
    
    const fetchSession = async () => {
      try {
        if (sessionId) {
          await import("@/services/api").then(m => m.stripeApi.verifySession(sessionId, token));
        }
        
        if (rentalId) {
          const data = await rentalsApi.get(rentalId, token);
          setRental(data.rental);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [rentalId, sessionId, token]);

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
        <Card className="text-left mb-8 border border-border/60 shadow-elegant">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-lg leading-none">Detalles de la Reserva</h3>
            <Separator className="bg-black/10" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">Producto</p>
                <p className="font-bold text-primary">{rental.product_id?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">Estado</p>
                <p className="font-bold">{STATUS_LABELS[rental.status] ?? rental.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">Fecha Inicio</p>
                <p className="font-bold">{new Date(rental.start_date + "T12:00:00").toLocaleDateString("es-PA")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">Fecha Devolución</p>
                <p className="font-bold">{new Date(rental.end_date + "T12:00:00").toLocaleDateString("es-PA")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">Total Pagado</p>
                <p className="font-black text-primary text-xl">{formatCurrency(rental.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">ID Reserva</p>
                <p className="font-mono text-[10px] text-muted-foreground break-all">{rental._id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : sessionId ? (
        <Card className="mb-8 border border-border/60 shadow-elegant bg-primary/5">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-full">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <p className="font-bold text-lg">Reserva Múltiple Procesada</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Tus reservas han sido procesadas correctamente. Puedes ver todos los detalles en tu perfil.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 border border-border/60 shadow-elegant">
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
