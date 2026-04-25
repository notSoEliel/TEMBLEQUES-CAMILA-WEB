import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, RefreshCw } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useErrorModal } from "@/components/ErrorModal";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", confirmed: "Confirmado",
  delivered: "Entregado", returned: "Devuelto", late: "Atrasado",
  damaged: "Dañado", cancelled: "Cancelado",
};

const ACTION_LABELS: Record<string, string> = {
  paid: "Marcar como Pagado",
  confirmed: "Confirmar Reserva",
  delivered: "Marcar como Entregado",
  returned: "Recibir Devolución",
  late: "Marcar Atrasado",
  damaged: "Marcar Dañado",
  cancelled: "Cancelar",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", paid: "default", confirmed: "default",
  delivered: "secondary", returned: "secondary", late: "destructive",
  damaged: "destructive", cancelled: "outline",
};

const TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: ["returned", "late", "damaged"],
  late: ["returned", "damaged"],
};

export default function AdminReservations() {
  const { token } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => { loadRentals(); }, [filter]);

  const loadRentals = async () => {
    setLoading(true);
    try {
      const data = await adminApi.rentals(token!, filter || undefined);
      setRentals(data.rentals);
    } catch (err: any) {
      showError(err?.message || "No se pudieron cargar las reservas.", "generic");
    }
    setLoading(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await adminApi.updateRentalStatus(id, status, token!);
      loadRentals();
    } catch (err: any) { showError(err.message, "generic"); }
  };

  return (
    <div className="space-y-6">
      {errorModal}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Reservas</h1>
          <p className="text-muted-foreground mt-1">Gestiona las reservas.</p>
        </div>
        <Button variant="outline" onClick={loadRentals}><RefreshCw className="h-4 w-4 mr-2" />Actualizar</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "pending", "paid", "confirmed", "delivered", "returned", "late", "damaged", "cancelled"].map((f) => (
          <Button key={f || "all"} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f ? STATUS_LABELS[f] : "Todos"}
          </Button>
        ))}
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : rentals.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-bold">Sin reservas</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  {r.product_id?.images?.[0] && <img src={r.product_id.images[0]} alt="" className="w-12 h-12 object-cover rounded-lg border-2 border-border" />}
                  <div>
                    <h3 className="font-bold">
                      {r.product_id?.name || "Producto"}
                      {r.selected_size && (
                        <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Talla: {r.selected_size}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{r.user_id?.name} ({r.user_id?.email})</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.start_date).toLocaleDateString("es-PA")} - {new Date(r.end_date).toLocaleDateString("es-PA")}
                      <span className="font-bold text-primary ml-2">${r.total}</span>
                    </div>

                    {(r.deposit_status === "held" || r.deposit_status === "failed" || r.late_fee_status === "failed" || r.late_fee_status === "charged") && (
                      <div className="mt-1 space-y-0.5 text-xs">
                        {(r.deposit_status === "held" || r.deposit_status === "failed") && (
                          <p className={r.deposit_status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                            Depósito: {r.deposit_status === "held" ? "Hold activo" : "Fallido"}
                          </p>
                        )}
                        {(r.late_fee_status === "charged" || r.late_fee_status === "failed") && (
                          <p className={r.late_fee_status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                            Mora: {r.late_fee_status === "charged" ? "Cobrada" : "Fallida"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_COLORS[r.status]} className="text-sm px-3 py-1">
                    {STATUS_LABELS[r.status]}
                  </Badge>
                  
                  {TRANSITIONS[r.status] && TRANSITIONS[r.status].length > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-8 mx-2 hidden lg:block" />
                      <div className="flex flex-wrap items-center gap-2">
                        {TRANSITIONS[r.status].map((s) => {
                          const isDestructive = s === "cancelled" || s === "damaged";
                          const btn = (
                            <Button key={s} size="sm" variant={isDestructive ? "destructive" : "outline"} onClick={isDestructive ? undefined : () => handleStatusChange(r._id, s)}>
                              {ACTION_LABELS[s] || s}
                            </Button>
                          );

                          if (isDestructive) {
                            return (
                              <ConfirmModal
                                key={s}
                                title={s === "cancelled" ? "Cancelar Reserva" : "Marcar como Dañado"}
                                description={`¿Estás seguro de que deseas cambiar el estado a ${STATUS_LABELS[s]}?`}
                                variant="destructive"
                                onConfirm={() => handleStatusChange(r._id, s)}
                              >
                                {btn}
                              </ConfirmModal>
                            );
                          }
                          return btn;
                        })}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
