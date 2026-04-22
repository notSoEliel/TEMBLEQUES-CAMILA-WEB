import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { rentalsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, ArrowRight } from "lucide-react";

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [rental, setRental] = useState<any>(null);
  const rentalId = searchParams.get("rental");

  useEffect(() => {
    if (rentalId && token) {
      rentalsApi.get(rentalId, token).then((data) => {
        setRental(data.rental);
      }).catch(console.error);
    }
  }, [rentalId, token]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary mb-6">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Reserva Confirmada
        </h1>
        <p className="text-muted-foreground">
          Tu reserva ha sido procesada exitosamente. Recibiras los detalles por correo electronico.
        </p>
      </div>

      {rental && (
        <Card className="text-left mb-8">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Detalles de la Reserva</h3>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Producto</p>
                <p className="font-medium">{rental.product_id?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <p className="font-medium capitalize">{rental.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha Inicio</p>
                <p className="font-medium">{new Date(rental.start_date).toLocaleDateString("es-PA")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha Devolucion</p>
                <p className="font-medium">{new Date(rental.end_date).toLocaleDateString("es-PA")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Pagado</p>
                <p className="font-bold text-primary text-lg">${rental.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ID Reserva</p>
                <p className="font-mono text-xs">{rental._id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
