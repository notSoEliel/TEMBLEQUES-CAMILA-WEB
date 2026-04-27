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
  User as UserIcon
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

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

  useEffect(() => {
    if (token && id) {
      loadData();
    }
  }, [token, id, currentPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rentalsRes, statsRes, userRes] = await Promise.all([
        adminApi.userRentals(id!, token!, { page: currentPage, limit: 10 }),
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
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/users")} className="rounded-full border-2 border-black">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {user.name || "Dashboard de Usuario"}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email || "Cargando..."}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Miembro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-PA") : "..."}</span>
            </div>
          </div>
        </div>
        <Badge className="bg-primary text-primary-foreground text-sm py-1 px-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
          Cliente
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl border-2 border-primary/20">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Pedidos Realizados</p>
              <p className="text-3xl font-black">{stats?.total || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-2xl border-2 border-destructive/20">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Pedidos Cancelados</p>
              <p className="text-3xl font-black">{stats?.cancelled || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl border-2 border-amber-200">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Pendientes de Pago</p>
              <p className="text-3xl font-black">{stats?.pending || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b-2 border-black">
          <CardTitle className="text-lg font-bold">Actividad de Reservas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wider font-black text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Período</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Acciones</th>
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
                  rentals.map((r) => (
                    <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={r.product_id?.images?.[0]} className="h-10 w-8 object-cover rounded border border-black/10" />
                          <span className="font-bold">{r.product_id?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {new Date(r.start_date + "T12:00:00").toLocaleDateString("es-PA")} - {new Date(r.end_date + "T12:00:00").toLocaleDateString("es-PA")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-primary">
                        ${r.total}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize font-bold border-2 border-black">
                          {STATUS_LABELS[r.status] || r.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" className="font-bold hover:bg-primary/10" onClick={() => navigate(`/admin/reservations?id=${r._id}`)}>
                          Ver Detalle
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          limit={10}
          onLimitChange={() => {}}
          totalResults={pagination.total}
        />
      )}
    </div>
  );
}
