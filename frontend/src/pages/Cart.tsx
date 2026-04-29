import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowLeft, ShoppingBag, CreditCard, Info, Plus, Minus } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "PAB" }).format(amount);
}

export default function Cart() {
  const { items, removeItem, updateQuantity, total, totalDeposit, clearCart } = useCart();
  const navigate = useNavigate();

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
          Tu carrito está vacío
        </h1>
        <p className="text-muted-foreground mb-8">
          Parece que aún no has añadido ninguna prenda típica panameña.
        </p>
        <Button asChild>
          <Link to="/catalog">Explorar Catálogo</Link>
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
            Tu Carrito
          </h1>
          <p className="text-muted-foreground mt-1">Revisa tus prendas seleccionadas antes de reservar.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Seguir comprando
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
                          {item.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full font-medium text-muted-foreground">
                            Talla: {item.size}
                          </span>
                          <span className="text-xs bg-primary/8 border border-primary/20 px-2.5 py-0.5 rounded-full font-medium text-primary">
                            {new Date(item.startDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
                            {" – "}
                            {new Date(item.endDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
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
                          <p className="text-[10px] text-destructive font-medium uppercase mb-1 tracking-wide">Stock máximo</p>
                        )}
                        <p className="text-xs text-muted-foreground">Alquiler x {item.quantity}</p>
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
            Vaciar carrito
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
                  Resumen de Reserva
                </h2>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Alquiler</span>
                  <span className="font-semibold">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reserva de Garantía</span>
                  <span className="font-semibold">{formatCurrency(totalDeposit)}</span>
                </div>

                {/* Info garantía */}
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    La reserva de {formatCurrency(totalDeposit)} se retendrá temporalmente como garantía.
                  </p>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Subtotal a Pagar</span>
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
                  onClick={() => navigate("/checkout/multi")}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Reservar Ahora
                </Button>

                <p className="text-center text-xs text-muted-foreground/60">
                  Pago seguro procesado por Stripe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
