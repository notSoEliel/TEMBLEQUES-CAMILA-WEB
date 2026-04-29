import React, { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { productsApi, rentalsApi, stripeApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Shield,
  CreditCard,
  Loader2,
  Package,
  CheckCircle2,
} from "lucide-react";
import ErrorPage from "@/pages/ErrorPage";
import { useErrorModal } from "@/components/ErrorModal";
import AvailabilityCalendar from "@/components/ui/AvailabilityCalendar";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS_SINGLE = [
  { id: 1, label: "Producto y Fechas", icon: Package },
  { id: 2, label: "Términos", icon: Shield },
  { id: 3, label: "Pagar", icon: CreditCard },
];

const STEPS_MULTI = [
  { id: 1, label: "Productos", icon: Package },
  { id: 2, label: "Términos", icon: Shield },
  { id: 3, label: "Pagar", icon: CreditCard },
];

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const DEPOSIT_RATE = 0.25;

function estimateDeposit(
  total: number,
  productSettings?: any,
): { required: boolean; amount: number } {
  return {
    required: true,
    amount: Math.round(total * DEPOSIT_RATE * 100) / 100,
  };
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current, steps }: { current: number, steps: { id: number; label: string; icon: any }[] }) {
  return (
    <nav
      aria-label="Progreso de reserva"
      className="flex items-center gap-0 mb-8 overflow-x-auto"
    >
      {steps.map((step, idx) => {
        const done = current > step.id;
        const active = current === step.id;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                  ${done ? "bg-primary border-primary text-primary-foreground" : ""}
                  ${active ? "bg-primary border-primary text-primary-foreground" : ""}
                  ${!done && !active ? "bg-muted border-border text-muted-foreground" : ""}
                `}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-px w-8 sm:w-14 shrink-0 mx-1 mt-[-10px] ${done ? "bg-primary" : "bg-border"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Checkout() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { items, total: cartTotal, totalDeposit: cartTotalDeposit, clearCart, isLoading: cartLoading } = useCart();
  const { user, token, isLoading: authLoading } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [calendarConflict, setCalendarConflict] = useState(false);
  const [paymentType, setPaymentType] = useState<"reservation" | "full">("reservation");

  const [selectedSize] = useState<string>(
    (location.state as any)?.selectedSize || "",
  );

  useEffect(() => {
    if (authLoading || cartLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }
    
    if (productId === "multi") {
      if (items.length === 0 && !submitting) {
        navigate("/cart");
        return;
      }
      setLoading(false);
      return;
    }

    if (!productId) return;
    if (!selectedSize) {
      navigate(`/product/${productId}`);
      return;
    }
    productsApi
      .get(productId)
      .then((data) => {
        setProduct(data.product);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId, user, items.length, selectedSize, submitting]);

  useEffect(() => {
    if (searchParams.get("cancelled") === "1") {
      showError(
        "El pago fue cancelado. Puedes intentarlo de nuevo.",
        "validation",
      );
    }
  }, []);

  const isMulti = productId === "multi";

  const selectedVariant = product?.variants?.find(
    (v: any) => v.size === selectedSize,
  );
  const pricePerDay =
    selectedVariant?.price_override ?? product?.rental_price ?? 0;
  const days = calculateDays(startDate, endDate);
  
  const subtotal = isMulti ? cartTotal : (days > 0 ? days * pricePerDay : 0);
  const itbms = subtotal * 0.07;
  const finalTotal = subtotal + itbms;
  const finalDeposit = isMulti ? cartTotalDeposit : estimateDeposit(finalTotal, product?.deposit_settings).amount;
  const depositRequired = isMulti ? cartTotalDeposit > 0 : estimateDeposit(finalTotal, product?.deposit_settings).required;

  function goToStep(step: number) {
    if (step === 2 && !isMulti && (!startDate || !endDate || days <= 0)) {
      showError(
        "Selecciona las fechas de alquiler antes de continuar.",
        "validation",
      );
      return;
    }
    if (step === 2 && calendarConflict) {
      showError(
        "Las fechas seleccionadas tienen conflicto de disponibilidad.",
        "validation",
      );
      return;
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      showError("Debes aceptar los términos y condiciones.", "validation");
      return;
    }
    setSubmitting(true);
    try {
      let rentalIds: string[] = [];

      if (isMulti) {
        const bulkItems: any[] = [];
        items.forEach((item) => {
          // Expand by quantity
          for (let i = 0; i < item.quantity; i++) {
            bulkItems.push({
              productId: item.productId,
              selectedSize: item.size,
              startDate: item.startDate,
              endDate: item.endDate,
              termsAccepted: true,
              paymentType,
            });
          }
        });
        const response = await rentalsApi.bulkCreate(bulkItems, token!);
        rentalIds = response.rentals.map((r: any) => r._id);
      } else {
        const response = await rentalsApi.create(
          {
            productId: productId!,
            selectedSize,
            startDate,
            endDate,
            termsAccepted,
            paymentType,
          },
          token!,
        );
        rentalIds = [response.rental._id];
      }

      const paymentResult = await stripeApi.createBulkCheckoutSession(
        rentalIds,
        token!,
      );

      if (isMulti) clearCart();

      if (paymentResult.url) {
        window.location.href = paymentResult.url;
      } else {
        navigate(`/confirmation?session_id=${paymentResult.sessionId}`);
      }
    } catch (err: any) {
      showError(
        err.message || "Error al procesar la reserva. Intenta de nuevo.",
        "generic",
      );
      setSubmitting(false);
    }
  }

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

  if (!isMulti && !product) return <ErrorPage variant="product-not-found" />;

  const steps = isMulti ? STEPS_MULTI : STEPS_SINGLE;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {errorModal}

      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <h1
        className="text-3xl font-bold mb-6 font-serif"
      >
        Finalizar Reserva
      </h1>

      <Stepper current={currentStep} steps={steps} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1 — Items & Dates */}
          {currentStep >= 1 && (
            <Card className="border border-border/60 shadow-elegant">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {currentStep > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
                  </span>
                  {isMulti ? `Prendas en el carrito (${items.length})` : "Producto y Fechas"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isMulti && product && (
                  <>
                    <div className="flex gap-4 p-4 bg-muted/30 rounded-xl border-2 border-dashed border-black/10">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="w-16 h-20 object-cover rounded-lg border border-border/60 shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                          <p className="text-sm text-muted-foreground font-medium whitespace-nowrap">Alquiler x 1</p>
                        </div>
                        <Badge variant="outline" className="mt-2 border border-border/60 font-black uppercase text-[10px]">
                          Talla: {selectedSize}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Selecciona el período de alquiler</Label>
                      <AvailabilityCalendar
                        productId={productId!}
                        stock={selectedVariant?.stock ?? 1}
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={(d) => {
                          setStartDate(d);
                          setEndDate("");
                          setCalendarConflict(false);
                        }}
                        onEndDateChange={setEndDate}
                        onConflict={setCalendarConflict}
                      />
                    </div>
                  </>
                )}

                {isMulti && (
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex gap-4">
                          {item.image && (
                            <img src={item.image} alt="" className="w-12 h-16 object-cover rounded border border-border/60" />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">Alquiler x {item.quantity}</p>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] border border-border/60 py-0">Talla: {item.size}</Badge>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(item.startDate + "T12:00:00").toLocaleDateString("es-PA", { month: "short", day: "numeric" })} - {new Date(item.endDate + "T12:00:00").toLocaleDateString("es-PA", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentStep === 1 && (
                  <Button 
                    className="w-full border border-border/60 shadow-elegant  transition-all py-6 text-lg font-bold"
                    onClick={() => goToStep(2)}
                    disabled={!isMulti && (!startDate || !endDate || days <= 0 || calendarConflict)}
                  >
                    Continuar a Términos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2 — Terms */}
          {currentStep >= 2 && (
            <Card className="border border-border/60 shadow-elegant">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {currentStep > 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "2"}
                  </span>
                  Términos y condiciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    El cliente acepta devolver el producto en las mismas condiciones en que fue entregado.
                  </p>
                  <p>
                    En caso de pérdida, daño o manchas permanentes, el cliente asume la responsabilidad total del costo de reparación o reposición.
                  </p>
                  {showFullTerms && (
                    <p>
                      Retrasos en la devolución podrán generar cargos adicionales proporcionales al tiempo de atraso.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFullTerms(!showFullTerms)}
                    className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                  >
                    {showFullTerms ? "Ver menos" : "Ver términos completos"}
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    He leído y acepto los términos y condiciones de alquiler.
                  </Label>
                </div>

                {currentStep === 2 && (
                  <Button 
                    className="w-full border border-border/60 shadow-elegant  transition-all py-6 text-lg font-bold"
                    onClick={() => goToStep(3)}
                    disabled={!termsAccepted}
                  >
                    Continuar a Revisión
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3 — Review & Pay */}
          {currentStep >= 3 && (
            <Card className="border border-border/60 shadow-elegant">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  Revisar y pagar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm">Modalidad de Pago</h3>
                  
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentType === "reservation" ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setPaymentType("reservation")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentType === "reservation" ? "border-primary" : "border-muted-foreground"}`}>
                          {paymentType === "reservation" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-bold">Solo Reserva (25%)</span>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(finalDeposit)}</span>
                    </div>
                  </div>

                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentType === "full" ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setPaymentType("full")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentType === "full" ? "border-primary" : "border-muted-foreground"}`}>
                          {paymentType === "full" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-bold">Pago Completo (100%)</span>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full font-bold border border-border/60 shadow-elegant  transition-all py-8 text-xl"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="animate-spin" /> : `Pagar ${formatCurrency(paymentType === "full" ? finalTotal : finalDeposit)}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:col-span-1 sticky top-24">
          <Card className="border border-border/60 shadow-elegant">
            <CardHeader className="pb-3 border-b-2 border-black bg-muted/30">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex justify-between items-center">
                <span>Resumen</span>
                {isMulti && <span className="text-xs text-muted-foreground font-normal normal-case">({items.length} ítems)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ITBMS (7%)</span>
                  <span className="font-bold">{formatCurrency(itbms)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">Total Alquiler</span>
                  <span className="font-black text-2xl text-primary">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/10 flex flex-col items-center justify-center text-center">
                <span className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-1">Monto a Pagar Hoy</span>
                <span className="font-black text-3xl text-primary">{formatCurrency(paymentType === "full" ? finalTotal : finalDeposit)}</span>
              </div>

              {paymentType === "reservation" && (
                <div className="mt-3 text-center px-1">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    Saldo restante: <span className="text-destructive">{formatCurrency(finalTotal - finalDeposit)}</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight italic opacity-70">
                    a pagar en tienda
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
