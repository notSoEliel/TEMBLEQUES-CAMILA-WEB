import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Download,
  Search,
  Loader2,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useErrorModal } from "@/components/ErrorModal";
import { formatCurrency } from "@/lib/utils";

export default function Reports() {
  const { token } = useAuth();
  const { showError } = useErrorModal();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters & Pagination from URL
  const query = searchParams.get("query") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const sortBy = searchParams.get("sortBy") || "rentalsCount"; // rentalsCount, totalRevenue, totalDaysRented, name
  const sortOrder = searchParams.get("sortOrder") || "desc"; // asc, desc

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await adminApi.getInventoryStats(token);
        setStats(res.stats || []);
      } catch (err: any) {
        showError(err?.message || "Error al cargar reporte de rotación.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (newQuery) {
      newParams.set("query", newQuery);
    } else {
      newParams.delete("query");
    }
    newParams.set("page", "1"); // Reset page
    setSearchParams(newParams);
  };

  const handleSort = (field: string) => {
    const newParams = new URLSearchParams(searchParams);
    const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    newParams.set("sortBy", field);
    newParams.set("sortOrder", newOrder);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportCSV = async () => {
    if (!token) return;
    try {
      setExporting(true);
      const csvText = await adminApi.exportCsv(token);
      
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `reporte_rotacion_inventario_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      showError(err?.message || "Error al exportar reporte a CSV.");
    } finally {
      setExporting(false);
    }
  };

  // Filter and sort stats locally based on searchParams
  const filteredStats = stats.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  const sortedStats = [...filteredStats].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedStats.length;
  const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
  const paginatedStats = sortedStats.slice((page - 1) * limit, page * limit);

  // Overall KPIs
  const totalRentals = stats.reduce((sum, item) => sum + item.rentalsCount, 0);
  const totalRevenue = stats.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalDaysRented = stats.reduce((sum, item) => sum + item.totalDaysRented, 0);

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1
            className="text-4xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Rotación y Desempeño Comercial
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Métricas clave sobre la rotación de polleras, tembleques y rentabilidad comercial de variantes.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          disabled={exporting || loading || stats.length === 0}
          className="rounded-[2rem] h-11 bg-primary text-primary-foreground hover:bg-primary/95 transition-all font-semibold shadow-elegant shrink-0 px-6"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </>
          )}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border/60 shadow-elegant rounded-[2rem]">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ingresos Totales (Alquileres)
              </span>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100/50 flex items-center justify-center text-emerald-600 border border-emerald-200/50">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-elegant rounded-[2rem]">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Volumen de Alquileres
              </span>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {totalRentals} transacciones
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-600 border border-blue-200/50">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-elegant rounded-[2rem]">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Días Totales en Uso
              </span>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {totalDaysRented} días
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100/50 flex items-center justify-center text-purple-600 border border-purple-200/50">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/60 shadow-elegant rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-muted/30 pb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                Desempeño de Inventario por Variante
              </CardTitle>
              <CardDescription>Visualiza la rotación y rentabilidad de cada talla y producto.</CardDescription>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar prenda..."
                value={query}
                onChange={handleSearchChange}
                className="pl-10 rounded-[2rem] border border-border/80 h-10 px-4 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Procesando métricas de inventario...</p>
            </div>
          ) : paginatedStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/45 mb-4" />
              <p className="font-semibold text-lg">No se encontraron datos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Prueba buscando otro nombre de producto o ajustando tus filtros.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th
                        onClick={() => handleSort("name")}
                        className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      >
                        Prenda {sortBy === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Talla</th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                      <th
                        onClick={() => handleSort("rentalsCount")}
                        className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      >
                        Alquileres {sortBy === "rentalsCount" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        onClick={() => handleSort("totalDaysRented")}
                        className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      >
                        Días Alquilado {sortBy === "totalDaysRented" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        onClick={() => handleSort("totalRevenue")}
                        className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      >
                        Ingresos Totales {sortBy === "totalRevenue" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Mantenimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStats.map((item, idx) => (
                      <tr key={`${item.productId}-${item.size}-${idx}`} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="py-4 font-semibold text-foreground">{item.name}</td>
                        <td className="py-4"><Badge variant="outline">{item.size}</Badge></td>
                        <td className="py-4 text-sm font-medium">{item.stock} uds</td>
                        <td className="py-4 text-sm font-semibold">{item.rentalsCount} veces</td>
                        <td className="py-4 text-sm text-muted-foreground">{item.totalDaysRented} días</td>
                        <td className="py-4 text-sm font-bold text-primary">{formatCurrency(item.totalRevenue)}</td>
                        <td className="py-4 text-right">
                          {item.inMaintenance ? (
                            <Badge variant="destructive" className="rounded-full">Mantenimiento</Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-full">Operativo</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando {Math.min(totalItems, (page - 1) * limit + 1)} - {Math.min(totalItems, page * limit)} de {totalItems} variantes
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="rounded-[2rem] border border-border/60"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="rounded-[2rem] border border-border/60"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
