import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowLeft, ShoppingBag, CreditCard, Info, Plus, Minus } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

export default function Cart() {
  const { items, removeItem, updateQuantity, total, totalDeposit, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-8">Parece que aún no has añadido ninguna prenda típica panameña.</p>
        <Button asChild className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all">
          <Link to="/catalog">Explorar Catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Tu Carrito</h1>
          <p className="text-muted-foreground mt-1">Revisa tus prendas seleccionadas antes de reservar.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="hover:bg-primary/10">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Seguir comprando
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-full sm:w-24 aspect-[3/4] sm:aspect-square bg-muted rounded-xl overflow-hidden border-2 border-black shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-xl font-bold leading-tight">{item.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-muted border border-black px-2 py-0.5 rounded-full font-bold">Talla: {item.size}</span>
                          <span className="text-xs bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full font-bold text-primary">
                            {new Date(item.startDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })} - {new Date(item.endDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center border-2 border-black rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-90 origin-left">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-muted transition-colors border-r-2 border-black"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className={`p-1.5 transition-colors border-l-2 border-black ${
                            item.quantity >= item.stock ? "bg-muted text-muted-foreground cursor-not-allowed" : "hover:bg-muted"
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        {item.quantity >= item.stock && (
                           <p className="text-[10px] text-destructive font-bold uppercase mb-1">Stock máximo alcanzado</p>
                        )}
                        <p className="text-sm text-muted-foreground">Alquiler x {item.quantity}</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button variant="ghost" onClick={clearCart} className="text-destructive hover:bg-destructive/10 font-bold">
            Vaciar carrito
          </Button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="bg-black text-white p-4 font-bold tracking-wider uppercase text-center text-sm">
                Resumen de Reserva
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Alquiler</span>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reserva de Garantía</span>
                  <span className="font-bold">{formatCurrency(totalDeposit)}</span>
                </div>
                
                <div className="bg-amber-50 border-2 border-black rounded-xl p-3 text-xs flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-amber-800">
                    La reserva de {formatCurrency(totalDeposit)} se retendrá temporalmente como garantía.
                  </p>
                </div>

                <Separator className="bg-black/20 h-0.5" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Subtotal a Pagar</span>
                  <span className="font-black text-2xl text-primary">{formatCurrency(total)}</span>
                </div>

                <Button 
                  size="lg" 
                  className="w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all py-6 text-lg font-bold mt-4"
                  onClick={() => navigate("/checkout/multi")}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Reservar Ahora
                </Button>

                <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
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
