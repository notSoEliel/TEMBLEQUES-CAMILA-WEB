import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowLeft, ShoppingBag, CreditCard, Info, Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function Cart() {
  const { items, removeItem, updateQuantity, total, totalDeposit, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useI18n();

  const handleReserve = () => {
    if (!user) {
      navigate("/login?redirect=/checkout/multi");
      return;
    }
    navigate("/checkout/multi");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="bg-primary/8 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-primary/50" />
        </div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {t("cart.emptyTitle")}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t("cart.emptySubtitle")}
        </p>
        <Button asChild>
          <Link to="/catalog">{t("cart.exploreBtn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1
            className="text-3xl lg:text-4xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {t("cart.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("cart.subtitle")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("cart.continueBtn")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-elegant transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Imagen */}
                  <div className="w-full sm:w-24 aspect-[3/4] sm:aspect-square bg-muted rounded-2xl overflow-hidden shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-lg font-semibold leading-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {getLocalizedText(item.name, item.name_en, language)}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full font-medium text-muted-foreground">
                            {t("cart.size")} {item.size}
                          </span>
                          <span className="text-xs bg-primary/8 border border-primary/20 px-2.5 py-0.5 rounded-full font-medium text-primary">
                            {new Date(item.startDate + "T12:00:00").toLocaleDateString(language === "en" ? "en-US" : "es-PA", { day: "numeric", month: "short" })}
                            {" – "}
                            {new Date(item.endDate + "T12:00:00").toLocaleDateString(language === "en" ? "en-US" : "es-PA", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/8 shrink-0 rounded-full"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-5">
                      {/* Stepper elegante */}
                      <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-background transition-colors text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            item.quantity >= item.stock
                              ? "text-muted-foreground cursor-not-allowed"
                              : "hover:bg-background text-foreground"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        {item.quantity >= item.stock && (
                          <p className="text-[10px] text-destructive font-medium uppercase mb-1 tracking-wide">{t("cart.maxStock")}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{t("cart.rentalQty")} {item.quantity}</p>
                        <p className="text-xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <button
            onClick={clearCart}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors px-1 py-2"
          >
            {t("cart.clearCart")}
          </button>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="overflow-hidden">
              {/* Header del resumen — elegante, sin negro brutal */}
              <div className="bg-primary/6 px-6 py-4 border-b border-border/60">
                <h2
                  className="font-semibold text-foreground text-sm tracking-wide"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {t("cart.summaryTitle")}
                </h2>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.subtotalRental")}</span>
                  <span className="font-semibold">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.depositGuarantee")}</span>
                  <span className="font-semibold">{formatCurrency(totalDeposit)}</span>
                </div>


                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{t("cart.subtotalToPay")}</span>
                  <span
                    className="font-bold text-2xl text-primary"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {formatCurrency(total)}
                  </span>
                </div>

                <Button
                  size="lg"
                  className="w-full mt-2 shadow-md"
                  onClick={handleReserve}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {t("cart.reserveBtn")}
                </Button>

                <p className="text-center text-xs text-muted-foreground/60">
                  {t("cart.securePayment")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
