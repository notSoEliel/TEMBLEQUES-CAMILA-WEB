import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { adminApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Package,
  CalendarCheck,
  Users,
  AlertTriangle,
  DollarSign,
  Clock,
  Info,
  ArrowRight,
} from "lucide-react";

type TopProduct = { name: string; count: number };
type UpcomingReturn = {
  product_id?: { name?: string };
  user_id?: { name?: string; email?: string };
  end_date: string;
};

interface DashboardData {
  activeRentals?: number;
  monthlyRevenue?: number;
  totalUsers?: number;
  totalProducts?: number;
  damagedCount?: number;
  statusBreakdown?: Record<string, number>;
  topProducts?: TopProduct[];
  upcomingReturns?: UpcomingReturn[];
  possibleLateReturns?: UpcomingReturn[];
}

const STATUS_CONFIG = [
  { key: "pending", label: "Pendientes", variant: "outline" as const },
  { key: "paid", label: "Pagados", variant: "info" as const },
  { key: "confirmed", label: "Confirmados", variant: "secondary" as const },
  { key: "delivered", label: "En Uso", variant: "warning" as const },
  { key: "returned", label: "Devueltos", variant: "success" as const },
  { key: "late", label: "Atrasados", variant: "destructive" as const },
  { key: "damaged", label: "Dañados", variant: "destructive" as const },
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      adminApi
        .dashboard(token)
        .then((data) => {
          setDashboard(data.dashboard);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded-xl mb-2" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Reservas Activas",
      value: dashboard?.activeRentals ?? 0,
      icon: CalendarCheck,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      trend: "+12%",
    },
    {
      label: "Ingresos del Mes",
      value: formatCurrency(dashboard?.monthlyRevenue ?? 0),
      icon: DollarSign,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: "+8%",
    },
    {
      label: "Total Usuarios",
      value: dashboard?.totalUsers ?? 0,
      icon: Users,
      bgColor: "bg-sky-50",
      iconColor: "text-sky-600",
      trend: "+5%",
    },
    {
      label: "Total Productos",
      value: dashboard?.totalProducts ?? 0,
      icon: Package,
      bgColor: "bg-violet-50",
      iconColor: "text-violet-600",
      trend: "estable",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Resumen general de la plataforma.
        </p>
      </div>

      {/* Onboarding Bar */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/8 to-accent/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-primary/12 rounded-xl shrink-0">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              ¿Eres nuevo en el panel?
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Aprende qué hace cada pestaña y cómo funcionan los cobros automáticos.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link to="/admin/business-rules?section=tabs">
            Ver Guía Rápida
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="hover:shadow-elegant-lg transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </p>
                  <p
                    className="text-3xl font-bold mt-2 text-foreground"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {kpi.value}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{kpi.trend} vs mes anterior</p>
                </div>
                <div className={`p-3 rounded-xl ${kpi.bgColor} shrink-0`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Damaged Warning */}
      {(dashboard?.damagedCount ?? 0) > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-red-50 p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-xl shrink-0">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <span className="text-sm font-medium text-destructive">
            {dashboard?.damagedCount} producto(s) reportado(s) como dañado(s).
          </span>
        </div>
      )}

      {/* Status Breakdown */}
      <div className="space-y-4">
        <h2
          className="text-xl font-semibold text-foreground flex items-center gap-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <Package className="h-5 w-5 text-primary" />
          Estados por Etapa
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_CONFIG.map((status) => (
            <Card
              key={status.key}
              className="hover:shadow-elegant transition-shadow duration-150"
            >
              <CardContent className="p-4 text-center">
                <Badge variant={status.variant} className="text-[10px] mb-2">
                  {status.label}
                </Badge>
                <p
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {dashboard?.statusBreakdown?.[status.key] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Productos Más Alquilados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(dashboard?.topProducts?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {dashboard?.topProducts?.map((tp, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl ${i % 2 === 0 ? "bg-muted/40" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-lg font-bold text-muted-foreground/30 w-7"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm text-foreground">{tp.name}</span>
                    </div>
                    <Badge variant="default">{tp.count} reservas</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">Sin datos aún.</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Returns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Próximas Devoluciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(dashboard?.upcomingReturns?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {dashboard?.upcomingReturns?.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-sm p-3 rounded-xl ${i % 2 === 0 ? "bg-muted/40" : ""}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{r.product_id?.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {r.user_id?.name} · {r.user_id?.email}
                      </p>
                    </div>
                    <Badge variant="success">
                      {new Date(r.end_date).toLocaleDateString("es-PA")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">
                No hay devoluciones próximas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Possible Late Returns */}
        <Card className="lg:col-span-2 border-amber-200/60">
          <CardHeader className="bg-amber-50/60 rounded-t-2xl">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Clock className="h-5 w-5" />
              Posibles Atrasos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {(dashboard?.possibleLateReturns?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {dashboard?.possibleLateReturns?.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between text-sm p-4 rounded-xl ${i % 2 === 0 ? "bg-muted/40" : ""}`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{r.product_id?.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {r.user_id?.name} · {r.user_id?.email}
                      </p>
                      <p className="text-destructive text-xs font-medium mt-1.5">
                        Debió entregarse el:{" "}
                        {new Date(r.end_date).toLocaleDateString("es-PA")}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="ml-4 shrink-0">
                      <Link to="/admin/reservations?status=delivered">
                        Ver Reserva
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                No hay atrasos detectados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />
    </div>
  );
}
