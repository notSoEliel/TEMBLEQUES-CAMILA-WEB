import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Calendar } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { useSearchParams } from "react-router-dom";

export default function AdminUsers() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userRentals, setUserRentals] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [currentLimit, setCurrentLimit] = useState(Number(searchParams.get("limit")) || 15);

  useEffect(() => {
    // Ensure page and limit are always in the URL
    if (!searchParams.get("page") || !searchParams.get("limit")) {
      const newParams = new URLSearchParams(searchParams);
      if (!searchParams.get("page")) newParams.set("page", "1");
      if (!searchParams.get("limit")) newParams.set("limit", "15");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token, searchParams]);
  
  const loadUsers = async () => {
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 15;

    // Update local state to match URL
    if (page !== currentPage) setCurrentPage(page);
    if (limit !== currentLimit) setCurrentLimit(limit);

    setLoading(true);
    try {
      const response = await adminApi.users(token!, { page, limit });
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const viewRentals = async (userId: string) => {
    if (selectedUser === userId) { setSelectedUser(null); return; }
    setSelectedUser(userId);
    try {
      const response = await adminApi.userRentals(userId, token!, { limit: 100 }); // Get most rentals for now
      setUserRentals(response.data);
    } catch (err) { console.error(err); }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(page));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (limit: number) => {
    setCurrentLimit(limit);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("limit", String(limit));
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Usuarios</h1>
        <p className="text-muted-foreground mt-1">Clientes registrados en la plataforma.</p>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : users.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-bold">Sin usuarios registrados</p></CardContent></Card>
      ) : (
        <>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u._id}>
                <Card className="cursor-pointer transition-shadow" onClick={() => viewRentals(u._id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{u.name}</h3>
                      <p className="text-sm text-muted-foreground">{u.email}{u.phone ? ` | ${u.phone}` : ""}</p>
                      <p className="text-xs text-muted-foreground mt-1">Registrado: {new Date(u.createdAt).toLocaleDateString("es-PA")}</p>
                    </div>
                    <Badge variant="outline">{selectedUser === u._id ? "Ocultar" : "Ver Historial"}</Badge>
                  </CardContent>
                </Card>
                {selectedUser === u._id && (
                  <div className="ml-4 mt-2 mb-4 space-y-2">
                    {userRentals.length === 0 ? (
                      <p className="text-sm text-muted-foreground pl-4">Sin reservas.</p>
                    ) : userRentals.map((r) => (
                      <Card key={r._id} className="bg-muted/50">
                        <CardContent className="p-3 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{r.product_id?.name}</span>
                            <span className="text-muted-foreground">
                              {new Date(r.start_date).toLocaleDateString("es-PA")} - {new Date(r.end_date).toLocaleDateString("es-PA")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">${r.total}</span>
                            <Badge variant="outline" className="text-xs capitalize">{r.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}
