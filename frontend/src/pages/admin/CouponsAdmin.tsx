import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { couponsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Ticket,
  Plus,
  Trash2,
  Calendar,
  Percent,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useErrorModal } from "@/components/ErrorModal";
import { formatCurrency } from "@/lib/utils";

export default function CouponsAdmin() {
  const { token } = useAuth();
  const { showError } = useErrorModal();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [minPurchaseAmount, setMinPurchaseAmount] = useState("");

  const fetchCoupons = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await couponsApi.list(token);
      setCoupons(res.coupons || []);
    } catch (err: any) {
      showError(err?.message || "Error al cargar la lista de cupones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!code || !value) {
      showError("Por favor completa los campos obligatorios.");
      return;
    }

    try {
      setSubmitting(true);
      await couponsApi.create(
        {
          code: code.toUpperCase().trim(),
          discount_type: discountType,
          value: parseFloat(value),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          min_purchase_amount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : null,
        },
        token
      );
      
      // Reset form
      setCode("");
      setValue("");
      setExpiresAt("");
      setMaxUses("");
      setMinPurchaseAmount("");
      
      await fetchCoupons();
    } catch (err: any) {
      showError(err?.message || "Error al crear el cupón.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: any) => {
    if (!token) return;
    try {
      await couponsApi.update(coupon._id, { is_active: !coupon.is_active }, token);
      await fetchCoupons();
    } catch (err: any) {
      showError(err?.message || "Error al cambiar el estado del cupón.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm("¿Está seguro de que desea eliminar este cupón?")) return;
    try {
      await couponsApi.delete(id, token);
      await fetchCoupons();
    } catch (err: any) {
      showError(err?.message || "Error al eliminar el cupón.");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1
          className="text-4xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Gestión de Cupones
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Crea y administra códigos de descuento para promociones locales en Balboas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <Card className="border border-border/60 shadow-elegant rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                Nuevo Cupón
              </CardTitle>
              <CardDescription>Establece las reglas del descuento.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Código de Cupón *
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="E.g. POLLERA20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="rounded-[2rem] border border-border/80 h-11 px-4 focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minPurchaseAmount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Compra Mínima (PAB, opcional)
                  </Label>
                  <Input
                    id="minPurchaseAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Sin mínimo"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    className="rounded-[2rem] border border-border/80 h-11 px-4 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de Descuento
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={discountType === "percentage" ? "default" : "outline"}
                      onClick={() => setDiscountType("percentage")}
                      className="rounded-[2rem] h-10 border border-border/60"
                    >
                      <Percent className="h-4 w-4 mr-2" /> Porcentaje
                    </Button>
                    <Button
                      type="button"
                      variant={discountType === "fixed" ? "default" : "outline"}
                      onClick={() => setDiscountType("fixed")}
                      className="rounded-[2rem] h-10 border border-border/60"
                    >
                      <DollarSign className="h-4 w-4 mr-2" /> Fijo ($)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor del Descuento *
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={discountType === "percentage" ? "E.g. 15" : "E.g. 25.00"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="rounded-[2rem] border border-border/80 h-11 px-4 focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fecha de Expiración (Opcional)
                  </Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="rounded-[2rem] border border-border/80 h-11 px-4 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxUses" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Límite de Usos (Opcional)
                  </Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Sin límite"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="rounded-[2rem] border border-border/80 h-11 px-4 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-[2rem] h-11 bg-primary text-primary-foreground hover:bg-primary/95 transition-all mt-4 font-semibold shadow-elegant"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Crear Cupón
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Coupons List Column */}
        <div className="lg:col-span-2">
          <Card className="border border-border/60 shadow-elegant rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                Cupones Activos
              </CardTitle>
              <CardDescription>Historial de códigos de descuento creados.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Cargando cupones...</p>
                </div>
              ) : coupons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Ticket className="h-12 w-12 text-muted-foreground/45 mb-4" />
                  <p className="font-semibold text-lg">No hay cupones creados</p>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Usa el formulario lateral para crear tu primer cupón promocional.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descuento</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usos</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiración</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Estado</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => {
                        const isExpired = coupon.expires_at && new Date() > new Date(coupon.expires_at);
                        const isLimitReached = coupon.max_uses && coupon.used_count >= coupon.max_uses;
                        const isValid = coupon.is_active && !isExpired && !isLimitReached;

                        return (
                          <tr key={coupon._id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="py-4 font-mono font-bold text-foreground">{coupon.code}</td>
                            <td className="py-4">
                              <span className="font-semibold">
                                {coupon.discount_type === "percentage" ? (
                                  `${coupon.value}%`
                                ) : (
                                  formatCurrency(coupon.value)
                                )}
                              </span>
                            </td>
                            <td className="py-4 text-sm text-muted-foreground">
                              {coupon.used_count} / {coupon.max_uses || "∞"}
                            </td>
                            <td className="py-4 text-sm text-muted-foreground">
                              {coupon.expires_at ? (
                                <span className={isExpired ? "text-destructive font-medium" : ""}>
                                  {new Date(coupon.expires_at).toLocaleDateString("es-PA")}
                                </span>
                              ) : (
                                "Nunca"
                              )}
                              {coupon.min_purchase_amount ? <span className="block text-[11px]">Mín.: {formatCurrency(coupon.min_purchase_amount)}</span> : null}
                            </td>
                            <td className="py-4 text-center">
                              <button
                                onClick={() => handleToggleActive(coupon)}
                                className="inline-flex items-center gap-1 focus:outline-none"
                                title="Cambiar disponibilidad"
                              >
                                {isValid ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-full py-0.5 px-2 flex.items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Activo
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="rounded-full py-0.5 px-2 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" /> Inactivo
                                  </Badge>
                                )}
                              </button>
                            </td>
                            <td className="py-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/8 hover:text-destructive rounded-full"
                                onClick={() => handleDelete(coupon._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
