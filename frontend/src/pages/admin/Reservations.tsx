import React, { useEffect, useState } from "react";
import CalendarView from "@/components/admin/CalendarView";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, RefreshCw } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, ArrowDownAz, ArrowUpAz } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useErrorModal } from "@/components/ErrorModal";
import OrderCard from "@/components/admin/OrderCard";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", reserved: "Reservado", paid: "Pagado", confirmed: "Confirmado",
  delivered: "Entregado", returned: "Devuelto", late: "Atrasado",
  damaged: "Dañado", cancelled: "Cancelado",
};

const ACTION_LABELS: Record<string, string> = {
  reserved: "Reservar",
  paid: "Marcar como Pagado",
  confirmed: "Confirmar Reserva",
  delivered: "Marcar como Entregado",
  returned: "Recibir Devolución",
  late: "Marcar Atrasado",
  damaged: "Marcar Dañado",
  cancelled: "Cancelar",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", reserved: "secondary", paid: "default", confirmed: "default",
  delivered: "secondary", returned: "secondary", late: "destructive",
  damaged: "destructive", cancelled: "outline",
};

const TRANSITIONS: Record<string, string[]> = {
  pending: ["reserved", "paid", "cancelled"],
  reserved: ["delivered", "cancelled"],
  paid: ["confirmed", "delivered", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: ["returned", "late", "damaged"],
  late: ["returned", "damaged"],
};

export default function AdminReservations() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { errorModal, showError } = useErrorModal();
  const [rentals, setRentals] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState(searchParams.get("status") || "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [currentLimit, setCurrentLimit] = useState(Number(searchParams.get("limit")) || 10);
  const [viewMode, setViewMode] = useState<"items" | "orders" | "calendar">((searchParams.get("view") as any) || "items");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sort") || "desc");

  useEffect(() => {
    // Ensure page and limit are always in the URL (except for calendar view)
    const viewMode = searchParams.get("view") || "items";
    if (viewMode !== "calendar") {
      if (!searchParams.get("page") || !searchParams.get("limit")) {
        const newParams = new URLSearchParams(searchParams);
        if (!searchParams.get("page")) newParams.set("page", "1");
        if (!searchParams.get("limit")) newParams.set("limit", "10");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, []);

  useEffect(() => { loadRentals(); }, [searchParams]);

  const loadRentals = async () => {
    const view = searchParams.get("view") || "items";
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const status = searchParams.get("status") || "";
    const sort = searchParams.get("sort") || "desc";

    // Update local state to match URL
    if (page !== currentPage) setCurrentPage(page);
    if (limit !== currentLimit) setCurrentLimit(limit);
    if (status !== filter) setFilter(status);
    if (sort !== sortOrder) setSortOrder(sort);

    // Don't load rentals for calendar view - it loads its own data
    if (view === "calendar") return;

    setLoading(true);
    try {
      const response = await adminApi.rentals(token!, { status: status || undefined, page, limit, sort });
      setRentals(response.data);
      setPagination(response.pagination);
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

  const handleBulkStatusChange = async (ids: string[], status: string) => {
    try {
      await Promise.all(ids.map(id => adminApi.updateRentalStatus(id, status, token!)));
      loadRentals();
    } catch (err: any) { showError(err.message, "generic"); }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(page));
    setSearchParams(newParams);
  };

  const handleLimitChange = (limit: number) => {
    setCurrentLimit(limit);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("limit", String(limit));
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleFilterChange = (f: string) => {
    setFilter(f);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (f) newParams.set("status", f);
    else newParams.delete("status");
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleViewModeChange = (mode: "items" | "orders" | "calendar") => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", mode);
    // Remove pagination params in calendar view since calendar doesn't use them
    if (mode === "calendar") {
      newParams.delete("page");
      newParams.delete("limit");
    } else {
      // Ensure pagination params when not in calendar view
      if (!newParams.has("page")) newParams.set("page", "1");
      if (!newParams.has("limit")) newParams.set("limit", "10");
    }
    setSearchParams(newParams);
  };

  const toggleSort = () => {
    const newSort = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newSort);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", newSort);
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      {errorModal}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Reservas</h1>
          <p className="text-muted-foreground mt-1">Gestiona las reservas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleSort} className="border border-border/60 font-black uppercase text-[10px] shadow-sm  transition-all">
            {sortOrder === "desc" ? <ArrowDownAz className="h-4 w-4 mr-2" /> : <ArrowUpAz className="h-4 w-4 mr-2" />}
            {sortOrder === "desc" ? "Recientes Primero" : "Antiguos Primero"}
          </Button>
          <Button variant="outline" onClick={loadRentals}><RefreshCw className="h-4 w-4 mr-2" />Actualizar</Button>
        </div>
      </div>

      <div className="flex bg-muted/50 p-1 rounded-xl border border-border/60 w-fit">
        <button
          onClick={() => handleViewModeChange("items")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
            viewMode === "items" 
              ? "bg-primary/8 text-primary shadow-sm" 
              : "text-muted-foreground hover:text-black"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Individual
        </button>
        <button
          onClick={() => handleViewModeChange("orders")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
            viewMode === "orders" 
              ? "bg-primary/8 text-primary shadow-sm" 
              : "text-muted-foreground hover:text-black"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Agrupado (Pedidos)
        </button>
        <button
          onClick={() => handleViewModeChange("calendar")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
            viewMode === "calendar" 
              ? "bg-primary/8 text-primary shadow-sm" 
              : "text-muted-foreground hover:text-black"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Calendario
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "pending", "reserved", "paid", "confirmed", "delivered", "returned", "late", "damaged", "cancelled"].map((f) => (
          <Button key={f || "all"} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => handleFilterChange(f)}>
            {f ? STATUS_LABELS[f] : "Todos"}
          </Button>
        ))}
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : rentals.length === 0 && viewMode !== "calendar" ? (
        <Card><CardContent className="p-8 text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-bold">Sin reservas</p></CardContent></Card>
      ) : viewMode === "calendar" ? (
        <CalendarView token={token!} filterStatus={filter} />
      ) : viewMode === "items" ? (
        <>
          <div className="space-y-3">
            {rentals.map((r) => (
              <Card key={r._id} className="border border-border/60 shadow-elegant">
                <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    {r.product_id?.images?.[0] && <img src={r.product_id.images[0]} alt="" className="w-12 h-16 object-cover rounded-lg border border-border/60 shrink-0" />}
                    <div>
                      <h3 className="font-black uppercase text-sm leading-tight">
                        {r.product_id?.name || "Producto"}
                        {r.selected_size && (
                          <span className="ml-2 text-[10px] font-black bg-primary/8 text-primary px-1.5 py-0.5 rounded uppercase">
                            Talla: {r.selected_size}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{r.user_id?.name} ({r.user_id?.email})</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-bold uppercase">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.start_date).toLocaleDateString("es-PA", { timeZone: "UTC", month: "short", day: "numeric" })} - {new Date(r.end_date).toLocaleDateString("es-PA", { timeZone: "UTC", month: "short", day: "numeric" })}
                        <span className="font-black text-primary ml-2">Total: {formatCurrency(r.total)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_COLORS[r.status]} className="text-[10px] font-black uppercase px-3 py-1 border border-border/60 shadow-sm">
                      {STATUS_LABELS[r.status]}
                    </Badge>
                    
                    {TRANSITIONS[r.status] && TRANSITIONS[r.status].length > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-8 mx-2 hidden lg:block bg-black/10" />
                        <div className="flex flex-wrap items-center gap-2">
                          {TRANSITIONS[r.status].map((s) => {
                            const isDestructive = s === "cancelled" || s === "damaged";
                            const actionLabel = r.status === "reserved" && s === "delivered" ? "Cobrar Saldo y Entregar" : ACTION_LABELS[s] || s;
                            const btn = (
                              <Button key={s} size="sm" variant={isDestructive ? "destructive" : "outline"} className="text-[10px] font-black border border-border/60 shadow-sm active:shadow-none active:translate-y-0.5 transition-all" onClick={isDestructive ? undefined : () => handleStatusChange(r._id, s)}>
                                {actionLabel}
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


        </>
      ) : (
        <div className="space-y-6">
          {Object.entries(rentals.reduce((acc, r) => {
            const gid = r.order_group_id || `legacy-${r.user_id?.email}-${r.start_date}`;
            if (!acc[gid]) acc[gid] = [];
            acc[gid].push(r);
            return acc;
          }, {} as Record<string, any[]>)).map(([gid, group]) => (
            <OrderCard
              key={gid}
              orderGroupId={gid}
              rentals={group as any[]}
              onStatusChange={handleStatusChange}
              onBulkStatusChange={handleBulkStatusChange}
              statusLabels={STATUS_LABELS}
              statusColors={STATUS_COLORS}
              actionLabels={ACTION_LABELS}
              transitions={TRANSITIONS}
            />
          ))}
        </div>
      )}

      {viewMode !== "calendar" && pagination && pagination.totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-border/40">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Ver:</span>
              <select
                value={currentLimit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="h-9 rounded-xl border-2 border-border/40 bg-background px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {[5, 10, 20, 50].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <span>Total: <span className="font-bold text-foreground">{pagination.total}</span></span>
          </div>

          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1); }}
                  className={cn("rounded-xl border-2 border-border/40", currentPage <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && p - arr[i-1] > 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={p === currentPage}
                        onClick={(e) => { e.preventDefault(); handlePageChange(p); }}
                        className="rounded-xl border-2 border-border/40 font-bold"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                ))}

              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (currentPage < pagination.totalPages) handlePageChange(currentPage + 1); }}
                  className={cn("rounded-xl border-2 border-border/40", currentPage >= pagination.totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
