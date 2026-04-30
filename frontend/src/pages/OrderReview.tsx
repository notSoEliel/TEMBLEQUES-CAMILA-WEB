import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { rentalsApi, stripeApi, productsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, CreditCard, Trash2, Shield, CheckCircle2, Plus, Minus, AlertTriangle } from "lucide-react";
import ErrorPage from "@/pages/ErrorPage";
import { useErrorModal } from "@/components/ErrorModal";

import { formatCurrency } from "@/lib/utils";

export default function OrderReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderGroupId = searchParams.get("orderGroupId");
  const { user, token } = useAuth();
  const { errorModal, showError } = useErrorModal();

  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState<"reservation" | "full">("reservation");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!orderGroupId) {
      navigate("/profile");
      return;
    }

    setLoading(true);
    rentalsApi.my(token!, { page: 1, limit: 100 })
      .then((data) => {
        const groupRentals = data.data.filter((r: any) => 
          (r.order_group_id === orderGroupId || r._id === orderGroupId) && 
          r.status === "pending"
        );
        if (groupRentals.length === 0) {
          navigate("/profile");
          return;
        }
        setRentals(groupRentals);
        // Default paymentType from first item if it exists
        if (groupRentals[0]?.payment_type) {
          setPaymentType(groupRentals[0].payment_type);
        }
        setLoading(false);
      })
      .catch(() => {
        showError("No se pudo cargar el pedido.", "generic");
        setLoading(false);
      });
  }, [orderGroupId, user, token, navigate]);

  const loadData = async () => {
    try {
      const data = await rentalsApi.my(token!, { page: 1, limit: 100 });
      const groupRentals = data.data.filter((r: any) => 
        (r.order_group_id === orderGroupId || r._id === orderGroupId) && 
        r.status === "pending"
      );
      if (groupRentals.length === 0) {
        navigate("/profile");
        return;
      }
      setRentals(groupRentals);
    } catch (err) {
      console.error("Error reloading rentals:", err);
    }
  };

  const handleIncrement = async (productId: string, size: string, startDate: string, endDate: string) => {
    setSubmitting(true);
    try {
      // 1. Validate availability in DB
      const res = await productsApi.availability(productId, startDate, endDate);
      const bookedCount = res.booked.length;
      
      // Get product stock for this size
      const prodRes = await productsApi.get(productId);
      const variant = prodRes.product.variants.find((v: any) => v.size === size);
      const stock = variant?.stock || 0;

      if (bookedCount >= stock) {
        showError("Lo sentimos, ya no queda stock disponible para estas fechas.", "validation");
        setSubmitting(false);
        return;
      }

      // 2. Create new rental
      await rentalsApi.create({
        productId,
        selectedSize: size,
        startDate,
        endDate,
        termsAccepted: true,
        paymentType,
        orderGroupId: orderGroupId!
      }, token!);
      
      // We need to update the orderGroupId of the new rental to match the current one
      // But currently create() creates a NEW orderGroupId.
      // Ideally the backend should support adding to an existing group.
      // For now, let's just reload.
      await loadData();
    } catch (err: any) {
      showError(err.message || "No se pudo añadir la unidad.", "generic");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecrement = async (rentalId: string) => {
    setSubmitting(true);
    try {
      await rentalsApi.cancel(rentalId, token!);
      await loadData();
    } catch (err: any) {
      showError(err.message || "No se pudo reducir la cantidad.", "generic");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveGroup = async (productRentals: any[]) => {
    setSubmitting(true);
    try {
      await Promise.all(productRentals.map(r => rentalsApi.cancel(r._id, token!)));
      await loadData();
    } catch (err: any) {
      showError(err.message || "No se pudo eliminar el producto.", "generic");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (rentals.length === 0) return <ErrorPage variant="not-found" />;

  const subtotal = rentals.reduce((acc, r) => acc + (r.total || 0), 0);
  const itbms = subtotal * 0.07;
  const finalTotal = subtotal + itbms;
  const finalDeposit = rentals.reduce((acc, r) => acc + (r.deposit_amount || 0), 0) + (itbms * (rentals.reduce((acc, r) => acc + (r.deposit_amount || 0), 0) / subtotal)); 
  // Simplified deposit calculation for UI consistency
  const actualDepositToPay = rentals.reduce((acc, r) => acc + (r.deposit_amount || 0), 0) * 1.07;

  const depositRequired = rentals.some(r => r.deposit_required);

  const amountToPayNow = paymentType === "reservation" ? actualDepositToPay : finalTotal;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const paymentResult = await stripeApi.createBulkCheckoutSession(
        rentals.map(r => r._id),
        token!,
        orderGroupId!,
        paymentType
      );

      if (paymentResult.url) {
        window.location.href = paymentResult.url;
      } else {
        navigate(`/confirmation?session_id=${paymentResult.sessionId}`);
      }
    } catch (err: any) {
      showError(err.message || "Error al procesar el pedido.", "generic");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      {errorModal}
      
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/profile")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Perfil
      </Button>

      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Revisar Pedido Pendiente
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/60 shadow-elegant">
            <CardHeader className="pb-3 border-b-2 border-border bg-muted/20">
              <CardTitle>Artículos en el pedido ({rentals.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {/* Group rentals by product and size to show quantity */}
                {Object.values(rentals.reduce((acc: Record<string, any[]>, r: any) => {
                  const key = `${r.product_id._id}-${r.selected_size}-${r.start_date}-${r.end_date}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(r);
                  return acc;
                }, {})).map((group) => {
                  const items = group as any[];
                  const r = items[0];
                  const qty = items.length;
                  return (
                    <div key={r._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 gap-4">
                      <div className="flex items-center gap-4">
                        {r.product_id?.images?.[0] && (
                          <img src={r.product_id.images[0]} alt="" className="w-16 h-20 object-cover rounded border border-border/60 shrink-0" />
                        )}
                        <div>
                            <div className="flex justify-between items-start">
                              <p className="font-black text-lg leading-tight uppercase">{r.product_id?.name}</p>
                              <p className="text-sm text-muted-foreground font-medium whitespace-nowrap">Alquiler x {qty}</p>
                            </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] bg-muted border border-border/60 px-2 py-0.5 rounded-full font-black uppercase">Talla: {r.selected_size}</span>
                            <span className="text-[10px] bg-primary/10 border-2 border-primary/30 px-2 py-0.5 rounded-full font-black uppercase text-primary">
                              {new Date(r.start_date).toLocaleDateString("es-PA", { day: "numeric", month: "short" })} - {new Date(r.end_date).toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                        {/* Quantity Selector */}
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Cantidad</p>
                          <div className="flex items-center border border-border/60 rounded-xl overflow-hidden bg-white shadow-sm">
                            <button
                              onClick={() => handleDecrement(r._id)}
                              disabled={submitting}
                              className="p-1.5 hover:bg-muted transition-colors border-r-2 border-black disabled:opacity-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-black text-sm">{qty}</span>
                            <button
                              onClick={() => handleIncrement(r.product_id._id, r.selected_size, r.start_date, r.end_date)}
                              disabled={submitting}
                              className="p-1.5 hover:bg-muted transition-colors border-l-2 border-black disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total Item</p>
                          <p className="font-black text-xl text-primary">{formatCurrency(r.total * qty)}</p>
                        </div>
 
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 -mt-4 sm:mt-0"
                          onClick={() => handleRemoveGroup(items)}
                          disabled={submitting}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {depositRequired && (
            <Card className="border border-border/60 shadow-elegant overflow-hidden">
              <CardHeader className="pb-3 border-b-2 border-black bg-yellow-50">
                <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-600" />
                  Modalidad de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentType("reservation")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentType === "reservation"
                        ? "border-primary bg-primary/5 shadow-elegant"
                        : "border-border hover:border-black"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold">Solo Reserva</span>
                      {paymentType === "reservation" && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Paga el 25% ahora para asegurar disponibilidad. El saldo se paga al retirar.
                    </p>
                  </button>

                  <button
                    onClick={() => setPaymentType("full")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentType === "full"
                        ? "border-primary bg-primary/5 shadow-elegant"
                        : "border-border hover:border-black"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold">Pago Completo</span>
                      {paymentType === "full" && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Paga el 100% ahora y olvídate de trámites al retirar.
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="border border-border/60 shadow-elegant sticky top-8">
            <CardHeader className="pb-3 border-b-2 border-black bg-muted/30">
              <CardTitle className="text-base font-bold uppercase tracking-widest">Resumen de Pago</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal Alquiler</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">ITBMS (7%)</span>
                <span className="font-medium">{formatCurrency(itbms)}</span>
              </div>
              
              <Separator className="bg-black/20" />
              
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">Total Pedido</span>
                <span className="font-bold text-lg">{formatCurrency(finalTotal)}</span>
              </div>

              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 overflow-hidden flex flex-col items-center justify-center text-center">
                <span className="font-bold text-primary text-[10px] uppercase tracking-widest mb-1">Monto a pagar hoy</span>
                <span className="font-black text-2xl text-primary whitespace-nowrap">{formatCurrency(amountToPayNow)}</span>
              </div>

              {paymentType === "reservation" && (
                <div className="mt-3 text-center px-1">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    Saldo restante: <span className="text-destructive">{formatCurrency(finalTotal - amountToPayNow)}</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight italic opacity-70">
                    a pagar en tienda
                  </p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full font-bold border border-border/60 shadow-elegant  transition-all py-8 text-xl mt-4"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Procesando…</>
                ) : (
                  <><CreditCard className="h-5 w-5 mr-2" /> Pagar {formatCurrency(amountToPayNow)}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
