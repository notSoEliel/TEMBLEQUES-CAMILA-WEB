import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { rentalsApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Package, XCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { useSearchParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { errorModal, showError } = useErrorModal();
  const navigate = useNavigate();
  const [rentals, setRentals] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [currentLimit, setCurrentLimit] = useState(Number(searchParams.get("limit")) || 10);
  const [currentView, setCurrentView] = useState(searchParams.get("view") || "active");

  useEffect(() => {
    // Ensure page, limit and view are in the URL
    if (!searchParams.get("page") || !searchParams.get("limit") || !searchParams.get("view")) {
      const newParams = new URLSearchParams(searchParams);
      if (!searchParams.get("page")) newParams.set("page", "1");
      if (!searchParams.get("limit")) newParams.set("limit", "10");
      if (!searchParams.get("view")) newParams.set("view", "active");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadRentals();
    }
  }, [token, searchParams]);

  const loadRentals = async () => {
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const view = searchParams.get("view") || "active";

    setCurrentPage(page);
    setCurrentLimit(limit);
    setCurrentView(view);

    setLoading(true);
    try {
      const response = await rentalsApi.my(token!, { page, limit, view });
      setRentals(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleViewChange = (view: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", view);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(page));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (limit: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("limit", String(limit));
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleCancelRental = async (rentalId: string) => {
    try {
      await rentalsApi.cancel(rentalId, token!);
      loadRentals();
    } catch (err: any) {
      showError(err.message || "No se pudo cancelar el pedido.", "generic");
    }
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return "Fecha no disponible";
      
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
      return `${s.toLocaleDateString("es-PA", options)} - ${e.toLocaleDateString("es-PA", options)}`;
    } catch {
      return "Fecha inválida";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {errorModal}

      {/* Profile Info Header */}
      <Card className="mb-8">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-serif">
                ¡Hola, {user?.name.split(' ')[0]}!
              </h1>
              <p className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm mt-1">
                <Calendar className="h-3.5 w-3.5" />
                Miembro desde {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("es-PA", { month: 'long', year: 'numeric' }) : "Cargando..."}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 sm:gap-8 border-t md:border-t-0 md:border-l border-border/40 pt-6 md:pt-0 md:pl-8">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {currentView === "active" ? "Alquileres Activos" : "Alquileres Cancelados"}
              </p>
              <p className="text-3xl font-bold font-serif">{pagination?.total || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 p-1 bg-muted/50 rounded-2xl border border-border/40 max-w-sm">
        <button
          onClick={() => handleViewChange("active")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
            currentView === "active" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-black/5"
          }`}
        >
          <History className="w-4 h-4" />
          Activos
        </button>
        <button
          onClick={() => handleViewChange("cancelled")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
            currentView === "cancelled" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-black/5"
          }`}
        >
          <XCircle className="w-4 h-4" />
          Cancelados
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-2 border-muted">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <Card className="border-2 border-dashed border-black/20">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold mb-1">No hay {currentView === "active" ? "alquileres activos" : "pedidos cancelados"}</p>
            <p className="text-muted-foreground text-sm">Todo el historial se sincroniza automáticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(
            rentals.reduce((acc: Record<string, any[]>, r: any) => {
              const groupId = r.order_group_id || r._id;
              if (!acc[groupId]) acc[groupId] = [];
              acc[groupId].push(r);
              return acc;
            }, {})
          ).map(([groupId, groupItems]) => {
            const items = groupItems as any[];
            const isPending = items.some((r: any) => r.status === "pending");
            const isPaidOrReserved = items.some((r: any) => r.status === "paid" || r.status === "reserved" || r.status === "confirmed");
            const groupTotal = items.reduce((sum: number, r: any) => sum + r.total, 0);
            const isCancelled = items.every((r: any) => r.status === "cancelled");

            return (
              <Card 
                key={groupId} 
                className={`transition-all ${
                  isCancelled 
                    ? "grayscale opacity-60 shadow-none" 
                    : ""
                }`}
              >
                <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Pedido #{groupId.slice(-6).toUpperCase()}
                      </CardTitle>
                      {isCancelled && items[0].updatedAt && (
                        <p className="text-[10px] font-bold text-destructive mt-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Cancelado el {new Date(items[0].updatedAt).toLocaleDateString("es-PA")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xl text-primary font-serif">{formatCurrency(groupTotal)}</span>
                      <Badge variant={STATUS_COLORS[items[0].status] || "outline"}>
                        {STATUS_LABELS[items[0].status] || items[0].status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {items.map((rental) => (
                      <div key={rental._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-4">
                          {rental.product_id?.images?.[0] && (
                            <img src={rental.product_id.images[0]} alt="" className="w-16 h-20 object-cover rounded-xl border border-border/60" />
                          )}
                          <div>
                            <h3 className="font-bold text-base leading-tight">{rental.product_id?.name || "Producto"}</h3>
                            <div className="flex gap-2 mt-1">
                              {rental.selected_size && (
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">Talla: {rental.selected_size}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 font-medium">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDateRange(rental.start_date, rental.end_date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-muted-foreground">{formatCurrency(rental.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isCancelled && (
                    <div className="p-4 border-t border-border/60 bg-muted/10 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1">
                        {isPaidOrReserved && (
                          <p className="text-[11px] text-muted-foreground font-medium italic">
                            Para cancelaciones de pedidos procesados, contacta a{" "}
                            <a href="mailto:soporte@temblequescamila.com" className="text-primary underline hover:no-underline">soporte</a> o{" "}
                            <a href="https://wa.me/50760000000" target="_blank" rel="noreferrer" className="text-primary underline hover:no-underline">WhatsApp</a>.
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {isPending && (
                          <>
                            <ConfirmModal
                              title="¿Cancelar Pedido?"
                              description="Esta acción liberará las prendas para otros usuarios. No se puede deshacer."
                              onConfirm={() => items.filter((r: any) => r.status === "pending").forEach((r: any) => handleCancelRental(r._id))}
                            >
                              <Button variant="outline" size="sm" className="h-9">
                                Cancelar Pedido
                              </Button>
                            </ConfirmModal>
                            <Button
                              size="sm"
                              className="h-9"
                              onClick={() => navigate(`/checkout/review?orderGroupId=${groupId}`)}
                            >
                              Pagar Pedido Completo
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {pagination && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              limit={currentLimit}
              onLimitChange={handleLimitChange}
              totalResults={pagination.total}
            />
          )}
        </div>
      )}
    </div>
  );
}
