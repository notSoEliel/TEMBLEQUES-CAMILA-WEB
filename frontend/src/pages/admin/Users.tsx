import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Calendar } from "lucide-react";
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
import { useSearchParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function AdminUsers() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userRentals, setUserRentals] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  
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
      const response = await adminApi.users(token!, { page, limit, search: searchParams.get("search") || undefined });
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

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    const normalizedSearch = search.trim();
    if (normalizedSearch) newParams.set("search", normalizedSearch);
    else newParams.delete("search");
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Usuarios</h1>
        <p className="text-muted-foreground mt-1">Clientes registrados en la plataforma.</p>
      </div>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2" role="search">
        <label htmlFor="admin-user-search" className="sr-only">Buscar usuarios</label>
        <Input id="admin-user-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o teléfono" />
        <Button type="submit"><Search className="h-4 w-4 mr-2" />Buscar</Button>
      </form>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : users.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="font-bold">Sin usuarios registrados</p></CardContent></Card>
      ) : (
        <>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u._id}>
                <Card className="hover:border-primary transition-colors border border-border/60 shadow-elegant hover:translate-y-0.5 hover:shadow-none overflow-hidden">
                  <Link to={`/admin/users/${u._id}`} className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{u.name}</h3>
                      <p className="text-sm text-muted-foreground">{u.email}{u.phone ? ` | ${u.phone}` : ""}</p>
                      <div className="flex gap-4 mt-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Registrado: {new Date(u.createdAt).toLocaleDateString("es-PA")}</p>
                        {u.clerkId && <p className="text-[10px] uppercase tracking-wider font-bold text-primary">✓ Clerk Sincronizado</p>}
                      </div>
                    </div>
                    <div className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl border border-border/60 shadow-sm text-sm">
                      Ver Perfil
                    </div>
                  </Link>
                </Card>
              </div>
            ))}
          </div>

          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-border/40">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Ver:</span>
                  <select
                    value={currentLimit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="h-9 rounded-xl border-2 border-border/40 bg-background px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[5, 10, 15, 20, 50].map((l) => (
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
        </>
      )}
    </div>
  );
}
