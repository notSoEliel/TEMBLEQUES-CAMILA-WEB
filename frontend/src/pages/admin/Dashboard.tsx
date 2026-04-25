import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { TrendingUp, Package, CalendarCheck, Users, AlertTriangle, DollarSign, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      adminApi.dashboard(token).then((data) => {
        setDashboard(data.dashboard);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Reservas Activas", value: dashboard?.activeRentals || 0, icon: CalendarCheck, color: "text-primary" },
    { label: "Ingresos del Mes", value: `$${dashboard?.monthlyRevenue || 0}`, icon: DollarSign, color: "text-green-600" },
    { label: "Total Usuarios", value: dashboard?.totalUsers || 0, icon: Users, color: "text-blue-600" },
    { label: "Total Productos", value: dashboard?.totalProducts || 0, icon: Package, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de la plataforma.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-muted border-2 border-border ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Damaged Warning */}
      {dashboard?.damagedCount > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium">{dashboard.damagedCount} producto(s) reportado(s) como dañado(s).</span>
          </CardContent>
        </Card>
      )}

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
            {dashboard?.topProducts?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.topProducts.map((tp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-muted-foreground/40 w-8">#{i + 1}</span>
                      <span className="font-medium">{tp.name}</span>
                    </div>
                    <Badge variant="outline">{tp.count} reservas</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Sin datos aún.</p>
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
            {dashboard?.upcomingReturns?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.upcomingReturns.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{r.product_id?.name}</p>
                      <p className="text-muted-foreground">{r.user_id?.name} - {r.user_id?.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {new Date(r.end_date).toLocaleDateString("es-PA")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay devoluciones próximas.</p>
            )}
          </CardContent>
        </Card>

        {/* Possible Late Returns */}
        <Card className="lg:col-span-2 border-orange-500/50">
          <CardHeader className="bg-orange-500/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              Posibles Atrasos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {dashboard?.possibleLateReturns?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.possibleLateReturns.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-bold text-base">{r.product_id?.name}</p>
                      <p className="text-muted-foreground">{r.user_id?.name} - {r.user_id?.email}</p>
                      <p className="text-destructive font-medium mt-1">
                        Debió entregarse el: {new Date(r.end_date).toLocaleDateString("es-PA")}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/reservations?status=delivered`}>
                        Ir a Reserva
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No hay atrasos detectados.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
