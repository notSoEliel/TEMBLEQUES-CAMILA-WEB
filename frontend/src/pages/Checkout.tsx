import React, { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { productsApi, rentalsApi, stripeApi, couponsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useI18n } from "@/i18n";
import { getLocalizedText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Shield,
  CreditCard,
  Loader2,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react";
import ErrorPage from "@/pages/ErrorPage";
import { useErrorModal } from "@/components/ErrorModal";
import AvailabilityCalendar from "@/components/ui/AvailabilityCalendar";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS_SINGLE = [
  { id: 1, label: "checkout.singleStep1", icon: Package },
  { id: 2, label: "checkout.singleStep2", icon: Shield },
  { id: 3, label: "checkout.singleStep3", icon: CreditCard },
];

const STEPS_MULTI = [
  { id: 1, label: "checkout.multiStep1", icon: Package },
  { id: 2, label: "checkout.multiStep2", icon: Shield },
  { id: 3, label: "checkout.multiStep3", icon: CreditCard },
];

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
}

import { formatCurrency } from "@/lib/utils";

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
function Stepper({ current, steps, t }: { current: number, steps: { id: number; label: string; icon: any }[], t: any }) {
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
                {t(step.label)}
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
  const { t, language } = useI18n();
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

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [timeLeft, setTimeLeft] = useState(2100);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (loading || authLoading || cartLoading) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, authLoading, cartLoading]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !token) return;
    try {
      setValidatingCoupon(true);
      setCouponError("");
      const categories = items.flatMap(i => i.category ? (Array.isArray(i.category) ? i.category : [i.category]) : []);
      const res = await couponsApi.validate(couponCode.trim(), cartTotal, categories, token);
      
      if (res.valid) {
        setAppliedCoupon(res.coupon);
      } else {
        setCouponError(t("checkout.couponInvalid"));
      }
    } catch (err: any) {
      setCouponError(err?.message || t("checkout.couponError"));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (authLoading || cartLoading) return;

    if (!user) {
      navigate("/login?redirect=/checkout/" + (productId ?? "multi"));
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
        t("checkout.cancelMsg"),
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
  
  // cartTotal already includes 7% ITBMS from ProductDetail.tsx. We extract it to get the base subtotal.
  const baseSubtotal = isMulti 
    ? items.reduce((acc, item) => acc + (item.price / 1.07) * item.quantity, 0)
    : (days > 0 ? days * pricePerDay : 0);

  const subtotal = baseSubtotal;
  const discount = appliedCoupon ? (appliedCoupon.discount_type === "percentage" ? Math.round(subtotal * (appliedCoupon.value / 100) * 100) / 100 : Math.min(subtotal, appliedCoupon.value)) : 0;
  const netSubtotal = Math.max(0, subtotal - discount);
  const itbms = netSubtotal * 0.07;
  const finalTotal = netSubtotal + itbms;
  const finalDeposit = isMulti ? Math.max(0, cartTotalDeposit - (discount * 0.25)) : estimateDeposit(finalTotal, product?.deposit_settings).amount;
  const depositRequired = isMulti ? cartTotalDeposit > 0 : estimateDeposit(finalTotal, product?.deposit_settings).required;

  function goToStep(step: number) {
    if (step === 2 && !isMulti && (!startDate || !endDate || days <= 0)) {
      showError(
        t("checkout.dateRequired"),
        "validation",
      );
      return;
    }
    if (step === 2 && calendarConflict) {
      showError(
        t("checkout.dateConflict"),
        "validation",
      );
      return;
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      showError(t("checkout.termsRequired"), "validation");
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
        undefined,
        paymentType,
        appliedCoupon?.code
      );

      if (isMulti) clearCart();

      if (paymentResult.url) {
        window.location.href = paymentResult.url;
      } else {
        navigate(`/confirmation?session_id=${paymentResult.sessionId}`);
      }
    } catch (err: any) {
      showError(
        err.message || t("checkout.rentalError"),
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

  if (isExpired) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto border-2 border-destructive/20 animate-bounce">
          <Clock className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          {t("checkout.expiredTitle")}
        </h2>
        <p className="text-muted-foreground">
          {t("checkout.expiredDesc")}
        </p>
        <Button
          onClick={() => navigate(isMulti ? "/cart" : "/catalog")}
          className="rounded-[2rem] h-11 bg-primary text-primary-foreground font-semibold px-6 shadow-elegant"
        >
          {t("checkout.expiredBtn")}
        </Button>
      </div>
    );
  }

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
        {t("checkout.backBtn")}
      </Button>

      <h1
        className="text-3xl font-bold mb-6 font-serif"
      >
        {t("checkout.mainTitle")}
      </h1>

      <Stepper current={currentStep} steps={steps} t={t} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-primary/5 p-4 rounded-xl border border-primary/10">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Clock className="h-5 w-5 animate-pulse" />
          <span className="text-sm">{t("checkout.timeLeft")}</span>
        </div>
        <span className="text-lg font-bold text-primary font-mono">{formatTime(timeLeft)}</span>
      </div>

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
                  {isMulti ? t("checkout.cartItemsTitle").replace("{count}", String(items.length)) : t("checkout.singleStep1")}
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
                          <p className="text-sm text-muted-foreground font-medium whitespace-nowrap">{t("cart.rentalQty")} 1</p>
                        </div>
                        <Badge variant="outline" className="mt-2 border border-border/60 font-black uppercase text-[10px]">
                          {t("cart.size")} {selectedSize}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">{t("checkout.rentalPeriodTitle")}</Label>
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
                              <p className="font-bold text-sm">{getLocalizedText(item.name, item.name_en, language)}</p>
                              <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">{t("cart.rentalQty")} {item.quantity}</p>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] border border-border/60 py-0">{t("cart.size")} {item.size}</Badge>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(item.startDate + "T12:00:00").toLocaleDateString(language === "en" ? "en-US" : "es-PA", { month: "short", day: "numeric" })} - {new Date(item.endDate + "T12:00:00").toLocaleDateString(language === "en" ? "en-US" : "es-PA", { month: "short", day: "numeric" })}
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
                    {t("checkout.continueTermsBtn")}
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
                  {t("checkout.termsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    {t("checkout.terms1")}
                  </p>
                  <p>
                    {t("checkout.terms2")}
                  </p>
                  {showFullTerms && (
                    <p>
                      {t("checkout.terms3")}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFullTerms(!showFullTerms)}
                    className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                  >
                    {showFullTerms ? t("checkout.termsShowLess") : t("checkout.termsShowMore")}
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    data-testid="checkout-terms-checkbox"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    {t("checkout.termsCheckbox")}
                  </Label>
                </div>

                {currentStep === 2 && (
                  <Button 
                    data-testid="checkout-continue-review"
                    className="w-full border border-border/60 shadow-elegant  transition-all py-6 text-lg font-bold"
                    onClick={() => goToStep(3)}
                    disabled={!termsAccepted}
                  >
                    {t("checkout.continueReviewBtn")}
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
                  {t("checkout.reviewPayTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm">{t("checkout.paymentMode")}</h3>
                  
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentType === "reservation" ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setPaymentType("reservation")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentType === "reservation" ? "border-primary" : "border-muted-foreground"}`}>
                          {paymentType === "reservation" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-bold">{t("checkout.onlyReservation")}</span>
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
                        <span className="font-bold">{t("checkout.fullPayment")}</span>
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
                  {submitting ? <Loader2 className="animate-spin" /> : `${t("checkout.payButton")} ${formatCurrency(paymentType === "full" ? finalTotal : finalDeposit)}`}
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
                <span>{t("checkout.summaryTitle")}</span>
                {isMulti && <span className="text-xs text-muted-foreground font-normal normal-case">({items.length} {language === "en" ? "items" : "ítems"})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.subtotalRental")}</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>{t("checkout.discountLabel")} ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("review.taxLabel")}</span>
                  <span className="font-bold">{formatCurrency(itbms)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">{t("review.totalOrder")}</span>
                  <span className="font-black text-2xl text-primary">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-border/60">
                <Label htmlFor="coupon" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("checkout.couponLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    type="text"
                    placeholder={t("checkout.couponPlaceholder")}
                    value={couponCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    disabled={!!appliedCoupon}
                    className="rounded-[2rem] border border-border/80 h-9 px-3 text-sm flex-1 bg-background"
                  />
                  {appliedCoupon ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                      className="rounded-[2rem] h-9 px-3 text-xs"
                    >
                      {t("checkout.removeBtn")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode}
                      className="rounded-[2rem] h-9 px-3 border-border/60 text-xs"
                    >
                      {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : t("checkout.applyBtn")}
                    </Button>
                  )}
                </div>
                {couponError && <p className="text-xs text-destructive font-medium">{couponError}</p>}
              </div>

              <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/10 flex flex-col items-center justify-center text-center">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{t("checkout.payToday")}</span>
                <span className="font-black text-2xl text-primary">{formatCurrency(paymentType === "full" ? finalTotal : finalDeposit)}</span>
              </div>

              {paymentType === "reservation" && (
                <div className="mt-3 text-center px-1">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    {t("checkout.balanceDue")} <span className="text-destructive">{formatCurrency(finalTotal - finalDeposit)}</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight italic opacity-70">
                    {t("checkout.payInStore")}
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
