import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { productsApi, rentalsApi, stripeApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Calendar, Shield, CreditCard, Loader2, Package } from "lucide-react";
import ErrorPage from "@/pages/ErrorPage";
import { useErrorModal } from "@/components/ErrorModal";
import AvailabilityCalendar from "@/components/ui/AvailabilityCalendar";

// ─── Step configuration ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Producto",  icon: Package  },
  { id: 2, label: "Fechas",    icon: Calendar  },
  { id: 3, label: "Términos",  icon: Shield    },
  { id: 4, label: "Pagar",     icon: CreditCard },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

// ─── Neobrutalista atoms ──────────────────────────────────────────────────────
function BrutalCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_#000] ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xl font-bold mb-4 border-b-[3px] border-black pb-2"
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {children}
    </h2>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Progreso de reserva" className="flex items-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((step, idx) => {
        const done    = current > step.id;
        const active  = current === step.id;
        const Icon    = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-10 h-10 border-[3px] border-black flex items-center justify-center font-bold text-sm transition-colors
                  ${done   ? "bg-black text-white" : ""}
                  ${active ? "bg-[var(--primary)] text-white border-[var(--primary)]" : ""}
                  ${!done && !active ? "bg-white text-black/40" : ""}
                `}
              >
                {done ? "✓" : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${active ? "text-[var(--primary)]" : done ? "text-black" : "text-black/40"}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-[3px] w-8 sm:w-12 shrink-0 ${done ? "bg-black" : "bg-black/15"}`} />
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
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { errorModal, showError } = useErrorModal();

  const [product, setProduct]         = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  // ── Load product ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!productId) return;

    productsApi.get(productId)
      .then((data) => { setProduct(data.product); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, user]);

  // Show cancellation notice if user came back from Stripe with ?cancelled=1
  useEffect(() => {
    if (searchParams.get("cancelled") === "1") {
      showError("El pago fue cancelado. Puedes intentarlo de nuevo.", "validation");
    }
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const days       = calculateDays(startDate, endDate);
  const totalPrice = product && days > 0 ? days * product.rental_price : 0;

  // ── Step validation ─────────────────────────────────────────────────────────
  function canGoToStep(step: number): boolean {
    if (step <= 1) return true;
    if (step === 2) return true; // always can move to dates
    if (step === 3) return Boolean(startDate && endDate && days > 0);
    if (step === 4) return Boolean(startDate && endDate && termsAccepted && days > 0);
    return false;
  }

  function goToStep(step: number) {
    if (step > currentStep && !canGoToStep(step)) {
      if (step === 3 && (!startDate || !endDate)) {
        showError("Selecciona las fechas de alquiler antes de continuar.", "validation");
      } else if (step === 4 && !termsAccepted) {
        showError("Debes aceptar los términos y condiciones para continuar.", "validation");
      }
      return;
    }
    setCurrentStep(step);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (new Date(startDate) >= new Date(endDate)) {
      showError("La fecha de inicio debe ser anterior a la fecha de fin.", "validation");
      return;
    }
    if (!termsAccepted) {
      showError("Debes aceptar los términos y condiciones para continuar.", "validation");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create rental
      const rentalData = await rentalsApi.create(
        { productId: productId!, startDate, endDate, termsAccepted },
        token!,
      );

      // 2. Initiate payment (demo or Stripe)
      const paymentResult = await stripeApi.createCheckoutSession(
        rentalData.rental._id,
        token!,
      );

      if (paymentResult.url) {
        // Real Stripe — redirect to hosted checkout
        window.location.href = paymentResult.url;
      } else {
        // Demo mode — go straight to confirmation
        navigate(`/confirmation?rental=${rentalData.rental._id}`);
      }
    } catch (err: any) {
      showError(err.message || "Error al procesar la reserva. Intenta de nuevo.", "generic");
      setSubmitting(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/10 w-1/3" />
          <div className="h-64 bg-black/10" />
        </div>
      </div>
    );
  }

  if (!product) return <ErrorPage variant="product-not-found" />;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {errorModal}

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-bold mb-6 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      {/* Page title */}
      <h1
        className="text-4xl font-bold mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Reservar Producto
      </h1>

      {/* Stepper */}
      <Stepper current={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column: steps content ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─ Step 1: Product summary ─ */}
          <BrutalCard className="p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => goToStep(1)}
            >
              <SectionTitle>
                <span className="text-[var(--primary)] mr-2">01.</span>
                Producto seleccionado
              </SectionTitle>
              {currentStep !== 1 && (
                <span className="text-xs font-bold text-black/40 uppercase">Cambiar</span>
              )}
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 border-[3px] border-black overflow-hidden w-24 h-32">
                <img
                  src={product.images?.[0] || `https://picsum.photos/seed/${product._id}/200/250`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <h3
                  className="font-bold text-xl leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {product.name}
                </h3>
                {product.size && (
                  <span className="inline-block border-[2px] border-black text-xs font-bold px-2 py-0.5 w-fit">
                    Talla: {product.size}
                  </span>
                )}
                <p className="text-sm text-black/60 mt-1 line-clamp-2">{product.description}</p>
                <p className="text-xl font-black mt-1">
                  {formatCurrency(product.rental_price)}
                  <span className="text-sm font-normal text-black/50">/día</span>
                </p>
              </div>
            </div>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="mt-6 w-full bg-black text-white font-bold py-3 border-[3px] border-black hover:bg-white hover:text-black transition-colors active:translate-y-[2px] shadow-[4px_4px_0px_0px_var(--primary)] hover:shadow-none"
              >
                Continuar → Seleccionar fechas
              </button>
            )}
          </BrutalCard>

          {/* ─ Step 2: Date selection ─ */}
          {currentStep >= 2 && (
            <BrutalCard className="p-6">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => goToStep(2)}
              >
                <SectionTitle>
                  <span className="text-[var(--primary)] mr-2">02.</span>
                  Seleccionar fechas
                </SectionTitle>
              </div>

              <AvailabilityCalendar
                productId={productId!}
                stock={product.stock}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(d) => { setStartDate(d); setEndDate(""); }}
                onEndDateChange={setEndDate}
              />

              {/* Selected range summary */}
              {startDate && endDate && days > 0 && (
                <div className="mt-4 border-[3px] border-black bg-[#F5F0E8] p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs font-bold uppercase text-black/50">Inicio</p>
                    <p className="font-bold">{new Date(startDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-black/50">Días</p>
                    <p className="font-black text-2xl">{days}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-black/50">Devolución</p>
                    <p className="font-bold">{new Date(endDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!startDate || !endDate) {
                      showError("Selecciona una fecha de inicio y de devolución.", "validation");
                      return;
                    }
                    if (days > 30) {
                      showError("El período máximo de alquiler es 30 días.", "validation");
                      return;
                    }
                    goToStep(3);
                  }}
                  disabled={!startDate || !endDate}
                  className="mt-6 w-full bg-black text-white font-bold py-3 border-[3px] border-black hover:bg-white hover:text-black transition-colors active:translate-y-[2px] shadow-[4px_4px_0px_0px_var(--primary)] hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Continuar → Términos y condiciones
                </button>
              )}
            </BrutalCard>
          )}

          {/* ─ Step 3: Terms & Conditions ─ */}
          {currentStep >= 3 && (
            <BrutalCard className="p-6">
              <SectionTitle>
                <span className="text-[var(--primary)] mr-2">03.</span>
                Términos y condiciones
              </SectionTitle>

              {/* Short version always visible */}
              <div className="bg-[#F5F0E8] border-[3px] border-black p-4 text-sm leading-relaxed space-y-2 mb-4">
                <p>El cliente acepta devolver el producto en las mismas condiciones en que fue entregado.</p>
                <p>En caso de pérdida, daño, rotura, manchas permanentes o deterioro causado durante el alquiler, el cliente asume la responsabilidad total del costo de reparación o reposición.</p>
                {showFullTerms && (
                  <>
                    <p>Si el alquiler corresponde únicamente a accesorios (tembleques, peinetas, joyería, etc.), el cliente será responsable en su totalidad por cualquier daño o pérdida del artículo.</p>
                    <p>Retrasos en devolución podrán generar cargos adicionales proporcionales al tiempo de atraso.</p>
                    <p>Tembleques Camila se reserva el derecho de retener o cobrar montos adicionales en caso de daños graves o pérdida total del artículo.</p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullTerms(!showFullTerms)}
                  className="text-xs font-bold underline"
                >
                  {showFullTerms ? "Ver menos" : "Ver términos completos"}
                </button>
              </div>

              {/* Checkbox */}
              <label
                className={`flex items-start gap-3 p-4 border-[3px] cursor-pointer transition-colors ${
                  termsAccepted ? "border-black bg-black/5" : "border-black bg-white"
                }`}
              >
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    data-testid="terms-checkbox"
                    className="peer sr-only"
                  />
                  <div
                    className={`w-5 h-5 border-[3px] border-black flex items-center justify-center font-black text-sm transition-colors ${
                      termsAccepted ? "bg-black text-white" : "bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {termsAccepted && "✓"}
                  </div>
                </div>
                <span className="text-sm font-medium leading-relaxed">
                  He leído y acepto los términos y condiciones de alquiler. Entiendo mi responsabilidad sobre el cuidado y devolución del producto en perfectas condiciones.
                </span>
              </label>

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!termsAccepted) {
                      showError("Debes aceptar los términos y condiciones para continuar.", "validation");
                      return;
                    }
                    goToStep(4);
                  }}
                  disabled={!termsAccepted}
                  className="mt-6 w-full bg-black text-white font-bold py-3 border-[3px] border-black hover:bg-white hover:text-black transition-colors active:translate-y-[2px] shadow-[4px_4px_0px_0px_var(--primary)] hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Continuar → Revisar y pagar
                </button>
              )}
            </BrutalCard>
          )}

          {/* ─ Step 4: Final review ─ */}
          {currentStep >= 4 && (
            <BrutalCard className="p-6 bg-[#F5F0E8]">
              <SectionTitle>
                <span className="text-[var(--primary)] mr-2">04.</span>
                Revisar y pagar
              </SectionTitle>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between py-2 border-b border-black/20">
                  <span className="font-medium text-black/60">Producto</span>
                  <span className="font-bold">{product.name}</span>
                </div>
                {product.size && (
                  <div className="flex justify-between py-2 border-b border-black/20">
                    <span className="font-medium text-black/60">Talla</span>
                    <span className="font-bold">{product.size}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-black/20">
                  <span className="font-medium text-black/60">Fecha inicio</span>
                  <span className="font-bold">{new Date(startDate + "T12:00:00").toLocaleDateString("es-PA")}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-black/20">
                  <span className="font-medium text-black/60">Fecha devolución</span>
                  <span className="font-bold">{new Date(endDate + "T12:00:00").toLocaleDateString("es-PA")}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-black/20">
                  <span className="font-medium text-black/60">Duración</span>
                  <span className="font-bold">{days} día{days !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-black/20">
                  <span className="font-medium text-black/60">Precio por día</span>
                  <span className="font-bold">{formatCurrency(product.rental_price)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-black text-lg">Total</span>
                  <span className="font-black text-2xl">{formatCurrency(totalPrice)}</span>
                </div>
              </div>

              <p className="text-xs text-black/50 mb-4 text-center">
                ✓ Términos y condiciones aceptados
              </p>

              <button
                type="button"
                id="checkout-button"
                data-testid="checkout-button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[var(--primary)] text-white font-black text-lg py-4 border-[3px] border-black hover:bg-black transition-colors active:translate-y-[2px] shadow-[6px_6px_0px_0px_#000] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pagar {formatCurrency(totalPrice)}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-black/40 mt-3">
                Pago seguro procesado por Stripe · Sin cargos ocultos
              </p>
            </BrutalCard>
          )}
        </div>

        {/* ── Right column: sticky order summary ───────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <BrutalCard className="p-5">
              <h3
                className="font-bold text-lg mb-4 border-b-[3px] border-black pb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Resumen
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-black/60">Producto</span>
                  <span className="font-bold text-right max-w-[55%] leading-tight">{product.name}</span>
                </div>
                {days > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-black/60">Días</span>
                      <span className="font-bold">{days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60">Por día</span>
                      <span className="font-bold">{formatCurrency(product.rental_price)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 pt-4 border-t-[3px] border-black flex justify-between items-center">
                <span className="font-black text-lg">Total</span>
                <span className="font-black text-2xl">
                  {totalPrice > 0 ? formatCurrency(totalPrice) : "—"}
                </span>
              </div>

              {/* Step shortcuts */}
              <div className="mt-6 space-y-2">
                {STEPS.map((step) => {
                  const done    = currentStep > step.id;
                  const active  = currentStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => done && goToStep(step.id)}
                      className={`w-full text-left text-xs py-1.5 px-3 border-[2px] font-bold transition-colors
                        ${active ? "border-[var(--primary)] text-[var(--primary)]" : ""}
                        ${done   ? "border-black bg-black/5 hover:bg-black hover:text-white cursor-pointer" : ""}
                        ${!done && !active ? "border-black/20 text-black/30 cursor-not-allowed" : ""}
                      `}
                    >
                      {done ? "✓ " : `${step.id}. `}
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </BrutalCard>
          </div>
        </div>
      </div>
    </div>
  );
}
