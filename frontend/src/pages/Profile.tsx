import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { rentalsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

import { useErrorModal } from "@/components/ErrorModal";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  paid: "default",
  confirmed: "default",
  delivered: "secondary",
  returned: "secondary",
  late: "destructive",
  damaged: "destructive",
  cancelled: "outline",
};

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

export default function Profile() {
  const { user, token } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      rentalsApi.my(token).then((data) => {
        setRentals(data.rentals);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {errorModal}

      {/* Profile Info */}
      <Card className="mb-8">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {user?.name}
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
            {user?.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Rental History */}
      <h2 className="text-xl font-bold mb-4">Historial de Alquileres</h2>
      <Separator className="mb-6" />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-bold mb-1">Sin reservas aún</p>
            <p className="text-muted-foreground text-sm">Explora nuestro catálogo para hacer tu primera reserva.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => (
            <Card key={rental._id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {rental.product_id?.images?.[0] && (
                      <img
                        src={rental.product_id.images[0]}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg border-2 border-border"
                      />
                    )}
                    <div>
                      <h3 className="font-bold">{rental.product_id?.name || "Producto"}</h3>
                      {rental.selected_size && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Talla: {rental.selected_size}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(rental.start_date).toLocaleDateString("es-PA")} -{" "}
                        {new Date(rental.end_date).toLocaleDateString("es-PA")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-primary">${rental.total}</span>
                    <Badge variant={STATUS_COLORS[rental.status] || "outline"}>
                      {STATUS_LABELS[rental.status] || rental.status}
                    </Badge>
                  </div>
                </div>

                {/* Actions for pending rentals */}
                {(rental.status === "pending" || rental.status === "paid") && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-end gap-3">
                    <ConfirmModal
                      title="Cancelar Reserva"
                      description="¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer."
                      confirmText="Sí, cancelar"
                      variant="destructive"
                      onConfirm={() => {
                        rentalsApi.cancel(rental._id, token!)
                          .then(() => {
                            // Optimistically update UI
                            setRentals(r => r.map(x => x._id === rental._id ? { ...x, status: "cancelled" } : x));
                          })
                          .catch(err => showError(err.message, "generic"));
                      }}
                    >
                      <Button variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </ConfirmModal>
                    {rental.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          import("@/services/api").then(({ stripeApi }) => {
                            stripeApi.createCheckoutSession(rental._id, token!)
                              .then((res) => {
                                if (res.url) window.location.href = res.url;
                                else window.location.href = `/confirmation?rental=${rental._id}`;
                              })
                              .catch(err => showError(err.message, "generic"));
                          });
                        }}
                      >
                        Pagar ahora
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
