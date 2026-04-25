import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { productsApi, rentalsApi, stripeApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Shield, CreditCard, Loader2, Package, CheckCircle2 } from "lucide-react";
import ErrorPage from "@/pages/ErrorPage";
import { useErrorModal } from "@/components/ErrorModal";
import AvailabilityCalendar from "@/components/ui/AvailabilityCalendar";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Producto",  icon: Package   },
  { id: 2, label: "Fechas",    icon: Calendar  },
  { id: 3, label: "Términos",  icon: Shield    },
  { id: 4, label: "Pagar",     icon: CreditCard },
];

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Progreso de reserva" className="flex items-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((step, idx) => {
        const done   = current > step.id;
        const active = current === step.id;
        const Icon   = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                  ${done   ? "bg-primary border-primary text-primary-foreground" : ""}
                  ${active ? "bg-primary border-primary text-primary-foreground" : ""}
                  ${!done && !active ? "bg-muted border-border text-muted-foreground" : ""}
                `}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-8 sm:w-14 shrink-0 mx-1 mt-[-10px] ${done ? "bg-primary" : "bg-border"}`} />
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
  const { user, token } = useAuth();
  const { errorModal, showError } = useErrorModal();

  const [product, setProduct]               = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [currentStep, setCurrentStep]       = useState(1);
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [termsAccepted, setTermsAccepted]   = useState(false);
  const [showFullTerms, setShowFullTerms]   = useState(false);
  const [calendarConflict, setCalendarConflict] = useState(false);

  // Get selectedSize from location state (passed from ProductDetail)
  const [selectedSize] = useState<string>(
    (location.state as any)?.selectedSize || ""
  );

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!productId) return;
    if (!selectedSize) {
      // No size selected — redirect back to product detail
      navigate(`/product/${productId}`);
      return;
    }
    productsApi.get(productId)
      .then((data) => { setProduct(data.product); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, user]);

  useEffect(() => {
    if (searchParams.get("cancelled") === "1") {
      showError("El pago fue cancelado. Puedes intentarlo de nuevo.", "validation");
    }
  }, []);

  // Find the selected variant to get the correct price
  const selectedVariant = product?.variants?.find((v: any) => v.size === selectedSize);
  const pricePerDay = selectedVariant?.price_override ?? product?.rental_price ?? 0;
  const days        = calculateDays(startDate, endDate);
  const totalPrice  = days > 0 ? days * pricePerDay : 0;

  function goToStep(step: number) {
    if (step === 3 && (!startDate || !endDate || days <= 0)) {
      showError("Selecciona las fechas de alquiler antes de continuar.", "validation");
      return;
    }
    if (step === 3 && calendarConflict) {
      showError("Las fechas seleccionadas se solapan con una reserva existente.", "validation");
      return;
    }
    if (step === 4 && !termsAccepted) {
      showError("Debes aceptar los términos y condiciones para continuar.", "validation");
      return;
    }
    setCurrentStep(step);
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      showError("Debes aceptar los términos y condiciones.", "validation");
      return;
    }
    if (calendarConflict) {
      showError("Las fechas seleccionadas tienen un conflicto. Vuelve al paso 2.", "validation");
      return;
    }
    setSubmitting(true);
    try {
      const rentalData = await rentalsApi.create(
        { productId: productId!, selectedSize, startDate, endDate, termsAccepted },
        token!,
      );
      const paymentResult = await stripeApi.createCheckoutSession(rentalData.rental._id, token!);

      if (paymentResult.url) {
        window.location.href = paymentResult.url;
      } else {
        navigate(`/confirmation?rental=${rentalData.rental._id}`);
      }
    } catch (err: any) {
      showError(err.message || "Error al procesar la reserva. Intenta de nuevo.", "generic");
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

  if (!product) return <ErrorPage variant="product-not-found" />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

      {errorModal}

      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Reservar Producto
      </h1>

      <Stepper current={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Step 1 — Product */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {currentStep > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
                </span>
                Producto seleccionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <img
                  src={product.images?.[0] || `https://picsum.photos/seed/${product._id}/200/250`}
                  alt={product.name}
                  className="w-20 h-28 object-cover rounded-lg border border-border shrink-0"
                />
                <div className="flex flex-col justify-center gap-1.5">
                  <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded w-fit">
                    Talla: {selectedSize}
                  </span>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(pricePerDay)}
                    <span className="text-sm font-normal text-muted-foreground">/día</span>
                  </p>
                </div>
              </div>

              {currentStep === 1 && (
                <Button className="mt-4 w-full" onClick={() => goToStep(2)}>
                  Continuar — Seleccionar fechas
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Dates */}
          {currentStep >= 2 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${currentStep > 2 ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
                    {currentStep > 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "2"}
                  </span>
                  Seleccionar fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AvailabilityCalendar
                  productId={productId!}
                  stock={selectedVariant?.stock ?? 1}
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={(d) => { setStartDate(d); setEndDate(""); setCalendarConflict(false); }}
                  onEndDateChange={setEndDate}
                  onConflict={setCalendarConflict}
                />

                {startDate && endDate && days > 0 && !calendarConflict && (
                  <div className="grid grid-cols-3 gap-3 text-center bg-muted/50 rounded-lg p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Inicio</p>
                      <p className="font-semibold">{new Date(startDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Días</p>
                      <p className="font-bold text-xl">{days}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Devolución</p>
                      <p className="font-semibold">{new Date(endDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <Button
                    className="w-full"
                    disabled={!startDate || !endDate || calendarConflict}
                    onClick={() => {
                      if (days > 30) {
                        showError("El período máximo de alquiler es 30 días.", "validation");
                        return;
                      }
                      goToStep(3);
                    }}
                  >
                    Continuar — Términos y condiciones
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3 — Terms */}
          {currentStep >= 3 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${currentStep > 3 ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
                    {currentStep > 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : "3"}
                  </span>
                  Términos y condiciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed space-y-2">
                  <p>El cliente acepta devolver el producto en las mismas condiciones en que fue entregado.</p>
                  <p>En caso de pérdida, daño, rotura, manchas permanentes o deterioro causado durante el alquiler, el cliente asume la responsabilidad total del costo de reparación o reposición.</p>
                  {showFullTerms && (
                    <>
                      <p>Si el alquiler corresponde únicamente a accesorios (tembleques, peinetas, joyería, etc.), el cliente será responsable en su totalidad por cualquier daño o pérdida del artículo.</p>
                      <p>Retrasos en devolución podrán generar cargos adicionales proporcionales al tiempo de atraso.</p>
                    </>
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
                    data-testid="terms-checkbox"
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    He leído y acepto los términos y condiciones de alquiler. Entiendo mi responsabilidad sobre el cuidado y devolución del producto en perfectas condiciones.
                  </Label>
                </div>

                {currentStep === 3 && (
                  <Button
                    className="w-full"
                    disabled={!termsAccepted}
                    onClick={() => goToStep(4)}
                  >
                    Continuar — Revisar y pagar
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4 — Review & Pay */}
          {currentStep >= 4 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  Revisar y pagar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Producto</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Talla</span>
                    <span className="font-medium">{selectedSize}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Período</span>
                    <span className="font-medium">
                      {new Date(startDate + "T12:00:00").toLocaleDateString("es-PA")} → {new Date(endDate + "T12:00:00").toLocaleDateString("es-PA")}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Duración</span>
                    <span className="font-medium">{days} día{days !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Precio por día</span>
                    <span className="font-medium">{formatCurrency(pricePerDay)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-primary">{formatCurrency(totalPrice)}</span>
                </div>

                <p className="text-xs text-muted-foreground text-center">✓ Términos y condiciones aceptados</p>

                <Button
                  size="lg"
                  className="w-full"
                  id="checkout-button"
                  data-testid="checkout-button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar {formatCurrency(totalPrice)}
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Pago seguro procesado por Stripe
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sticky summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen de Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Producto</span>
                  <span className="font-medium text-right max-w-[55%] leading-tight">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Talla</span>
                  <span className="font-medium">{selectedSize}</span>
                </div>
                {days > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Días</span>
                      <span className="font-medium">{days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Por día</span>
                      <span className="font-medium">{formatCurrency(pricePerDay)}</span>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-xl text-primary">
                    {totalPrice > 0 ? formatCurrency(totalPrice) : "—"}
                  </span>
                </div>

                {/* Step shortcuts for completed steps */}
                <div className="pt-2 space-y-1">
                  {STEPS.map((step) => {
                    const done   = currentStep > step.id;
                    const active = currentStep === step.id;
                    return (
                      <div
                        key={step.id}
                        onClick={() => done && setCurrentStep(step.id)}
                        className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded transition-colors
                          ${active ? "bg-primary/10 text-primary font-medium" : ""}
                          ${done ? "text-muted-foreground hover:bg-muted cursor-pointer" : "text-muted-foreground/50"}
                        `}
                      >
                        {done
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          : <step.icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-primary" : ""}`} />
                        }
                        {step.label}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
