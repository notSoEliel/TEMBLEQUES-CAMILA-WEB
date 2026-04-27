import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { rentalsApi, stripeApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, CreditCard, Trash2, Shield, CheckCircle2 } from "lucide-react";
import ErrorPage from "@/pages/ErrorPage";
import { useErrorModal } from "@/components/ErrorModal";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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

  const handleRemove = async (id: string) => {
    try {
      await rentalsApi.cancel(id, token!);
      const updated = rentals.filter(r => r._id !== id);
      if (updated.length === 0) {
        navigate("/profile");
      } else {
        setRentals(updated);
      }
    } catch (err: any) {
      showError(err.message || "No se pudo eliminar el artículo.", "generic");
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

  if (rentals.length === 0) return <ErrorPage variant="generic" />;

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
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="pb-3 border-b-2 border-border bg-muted/20">
              <CardTitle>Artículos en el pedido ({rentals.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {rentals.map((r) => (
                  <div key={r._id} className="flex items-center justify-between p-4 group">
                    <div className="flex items-center gap-4">
                      {r.product_id?.images?.[0] && (
                        <img src={r.product_id.images[0]} alt="" className="w-12 h-16 object-cover rounded border-2 border-black" />
                      )}
                      <div>
                        <p className="font-bold">{r.product_id?.name}</p>
                        <p className="text-xs text-muted-foreground">Talla: {r.selected_size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">${r.total}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(r._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {depositRequired && (
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
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
                        ? "border-primary bg-primary/5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
                        ? "border-primary bg-primary/5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-8">
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

              {paymentType === "reservation" && (
                <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 space-y-2 overflow-hidden">
                  <div className="flex justify-between items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="font-bold text-primary text-sm leading-tight">Monto a pagar hoy (25% + ITBMS)</span>
                    <span className="font-black text-2xl text-primary whitespace-nowrap">{formatCurrency(actualDepositToPay)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    El saldo pendiente se cobrará en tienda física al momento del retiro.
                  </p>
                </div>
              )}

              {paymentType === "full" && (
                <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 overflow-hidden">
                  <div className="flex justify-between items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="font-bold text-primary text-sm leading-tight">Monto a pagar hoy (100%)</span>
                    <span className="font-black text-2xl text-primary whitespace-nowrap">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                className="w-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all py-8 text-xl mt-4"
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
