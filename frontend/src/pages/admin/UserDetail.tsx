import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ShoppingBag, 
  XCircle, 
  Clock, 
  Calendar,
  Mail,
  Phone,
  User as UserIcon,
  CalendarCheck
} from "lucide-react";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  reserved: "Reservado",
  paid: "Pagado",
  confirmed: "Confirmado",
  delivered: "Entregado",
  returned: "Devuelto",
  late: "Atrasado",
  damaged: "Dañado",
  cancelled: "Cancelado",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "PAB",
  }).format(amount);
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [rentals, setRentals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    if (token && id) {
      loadData();
    }
  }, [token, id, currentPage, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rentalsRes, statsRes, userRes] = await Promise.all([
        adminApi.userRentals(id!, token!, { page: currentPage, limit: 10, status: filterStatus || undefined }),
        adminApi.userStats(id!, token!),
        adminApi.getUser(id!, token!)
      ]);
      setRentals(rentalsRes.data);
      setPagination(rentalsRes.pagination);
      setStats(statsRes.stats);
      setUserData(userRes.user);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const user = userData || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/users")} className="rounded-full border border-border/60">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {user.name || "Dashboard de Usuario"}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email || "Cargando..."}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>}
              <span className="flex items-center gap-1 font-bold text-primary"><ShoppingBag className="h-3 w-3" /> Total Gastado: {formatCurrency(stats?.totalSpent || 0)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Miembro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-PA") : "..."}</span>
            </div>
          </div>
        </div>
        <Badge className="bg-primary text-primary-foreground text-sm py-1 px-4 border border-border/60 shadow-sm uppercase">
          Cliente
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card 
          className={`border border-border/60 shadow-elegant bg-white cursor-pointer transition-all hover:translate-y-[-2px] ${filterStatus === "" ? "bg-primary/5 ring-2 ring-primary" : ""}`}
          onClick={() => { setFilterStatus(""); setCurrentPage(1); }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl border-2 border-primary/20 shrink-0">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Total Pedidos</p>
              <p className="text-2xl font-black leading-none">{stats?.total || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border border-border/60 shadow-elegant bg-white cursor-pointer transition-all hover:translate-y-[-2px] ${filterStatus === "cancelled" ? "bg-destructive/5 ring-2 ring-destructive" : ""}`}
          onClick={() => { setFilterStatus("cancelled"); setCurrentPage(1); }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-2xl border-2 border-destructive/20 shrink-0">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Cancelados</p>
              <p className="text-2xl font-black leading-none">{stats?.cancelled || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border border-border/60 shadow-elegant bg-white cursor-pointer transition-all hover:translate-y-[-2px] ${filterStatus === "pending" ? "bg-amber-50 ring-2 ring-amber-500" : ""}`}
          onClick={() => { setFilterStatus("pending"); setCurrentPage(1); }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl border-2 border-amber-200 shrink-0">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-black leading-none">{stats?.pending || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border border-border/60 shadow-elegant bg-white cursor-pointer transition-all hover:translate-y-[-2px] ${filterStatus === "reserved" ? "bg-cyan-50 ring-2 ring-cyan-500" : ""}`}
          onClick={() => { setFilterStatus("reserved"); setCurrentPage(1); }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-cyan-100 p-3 rounded-2xl border-2 border-cyan-200 shrink-0">
              <CalendarCheck className="h-8 w-8 text-cyan-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Reservados</p>
              <p className="text-2xl font-black leading-none">{stats?.reserved || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="border border-border/60 shadow-elegant overflow-hidden">
        <CardHeader className="bg-muted/30 border-b-2 border-black">
          <CardTitle className="text-lg font-bold">Actividad de Reservas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wider font-black text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">ID Pedido</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 h-16 bg-muted/20" />
                    </tr>
                  ))
                ) : rentals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Sin actividad registrada.
                    </td>
                  </tr>
                ) : (
                  rentals.map((r, index) => {
                    const prev = rentals[index - 1];
                    const next = rentals[index + 1];
                    const orderId = r.order_group_id || r._id;
                    const prevOrderId = prev ? (prev.order_group_id || prev._id) : null;
                    const nextOrderId = next ? (next.order_group_id || next._id) : null;
                    
                    const isFirstInGroup = orderId !== prevOrderId;
                    const isLastInGroup = orderId !== nextOrderId;
                    
                    return (
                      <tr 
                        key={r._id} 
                        className={`hover:bg-muted/30 transition-colors ${isLastInGroup ? 'border-b-2 border-black/10' : 'border-b-0'}`}
                      >
                        <td className="px-4 py-2 font-mono text-[10px] font-black align-middle">
                          {isFirstInGroup ? (
                            `#${orderId.slice(-6).toUpperCase()}`
                          ) : (
                            <span className="text-muted-foreground/30 ml-4">↳</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center gap-3">
                            <img src={r.product_id?.images?.[0]} className="h-8 w-6 object-cover rounded border border-black/10 shrink-0" />
                            <span className="font-bold text-xs">{r.product_id?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center gap-2 text-[11px]">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(r.start_date).toLocaleDateString("es-PA")} - {new Date(r.end_date).toLocaleDateString("es-PA")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-black text-primary text-xs align-middle">
                          {formatCurrency(r.total)}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <Badge variant="outline" className={`text-[10px] font-black uppercase border border-border/60 shadow-sm ${r.status === 'cancelled' ? 'bg-destructive/5' : ''}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 border border-border/60 shadow-sm hover:translate-y-[-1px] active:shadow-none transition-all" 
                            onClick={() => navigate(`/admin/reservations?status=${r.status}&page=1&limit=10`)}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-border/40">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total: <span className="font-bold text-foreground">{pagination.total}</span></span>
          </div>

          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
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
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p); }}
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
                  onClick={(e) => { e.preventDefault(); if (currentPage < pagination.totalPages) setCurrentPage(currentPage + 1); }}
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
