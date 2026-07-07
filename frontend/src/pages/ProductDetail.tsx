import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, ShoppingBag, Package, AlertTriangle, Plus, Minus, Info, X, CheckCircle2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import AvailabilityCalendar from "@/components/ui/AvailabilityCalendar";
import { useErrorModal } from "@/components/ErrorModal";
import ErrorPage from "@/pages/ErrorPage";

const CATEGORY_LABELS: Record<string, string> = {
  pollera: "Polleras",
  vestuario_masculino: "Vestuario Masculino",
  infantil: "Infantil",
  tembleques: "Tembleques",
  accesorios: "Accesorios",
  paquete_completo: "Paquetes Completos",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "PAB" }).format(amount);
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calendarConflict, setCalendarConflict] = useState(false);
  
  const { items, addItem, getAvailableStock } = useCart();
  const { errorModal, showError } = useErrorModal();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (id) {
      productsApi.get(id).then((data) => {
        setProduct(data.product);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-[3/4] bg-muted rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <ErrorPage variant="product-not-found" />;
  }

  const variants = product.variants || [];
  const availableVariants = variants.filter((v: any) => !v.in_maintenance && v.stock > 0);
  const totalStock = variants.reduce((s: number, v: any) => s + (v.stock || 0), 0);
  const isAvailable = availableVariants.length > 0;

  // Price range
  const prices = variants.map((v: any) => v.price_override ?? product.rental_price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.rental_price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.rental_price;
  const hasPriceRange = minPrice !== maxPrice;

  // Selected variant info
  const selectedVariant = variants.find((v: any) => v.size === selectedSize);
  const displayPrice = selectedVariant
    ? (selectedVariant.price_override ?? product.rental_price)
    : null;

  function handleAddToCart() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!selectedSize) {
      showError("Por favor selecciona una talla.", "validation");
      return;
    }
    if (!startDate || !endDate) {
      showError("Por favor selecciona las fechas de alquiler.", "validation");
      return;
    }
    if (calendarConflict) {
      showError("Las fechas seleccionadas tienen un conflicto de disponibilidad.", "validation");
      return;
    }

    const pricePerDay = selectedVariant?.price_override ?? product.rental_price;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    const days = Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
    const subtotal = pricePerDay * days;
    const itbms = subtotal * 0.07;
    const totalPrice = subtotal + itbms;
    
    // Deposit calculation logic (mirroring Checkout.tsx for now)
    const DEPOSIT_RATE = 0.25;
    const depositAmount = totalPrice * DEPOSIT_RATE;
    


    const maxAvailable = getAvailableStock(product._id, selectedSize, selectedVariant.stock);
    if (quantity > maxAvailable) {
      showError(`Solo puedes añadir ${maxAvailable} unidades más al carrito.`, "validation");
      return;
    }

    addItem({
      id: "", // Will be set by context
      productId: product._id,
      name: product.name,
      image: product.images?.[0] || "",
      size: selectedSize,
      quantity,
      price: totalPrice,
      depositAmount,
      startDate,
      endDate,
      stock: selectedVariant.stock,
      category: product.category,
    });

    setShowAddModal(true);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {errorModal}
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/catalog")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Catálogo
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <Card className="overflow-hidden relative group">
            <div className="aspect-[3/4] bg-muted relative">
              <img
                src={product.images?.[selectedImage] || "https://picsum.photos/seed/default/600/800"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.images?.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full shadow opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full shadow opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </button>
                </>
              )}
            </div>
          </Card>
          
          {product.images?.length > 1 && (
            <div className="relative">
              <div
                className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-xl border overflow-hidden transition-all shrink-0 snap-start ${
                      selectedImage === i ? "border-primary ring-2 ring-primary/20" : "border-border/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {/* Fade gradient on the right */}
              <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">{CATEGORY_LABELS[product.category]}</Badge>
              {isAvailable ? (
                <Badge variant="default">Disponible</Badge>
              ) : (
                <Badge variant="destructive">No Disponible</Badge>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              {product.name}
            </h1>

            {/* Price — show range or specific */}
            {selectedSize && displayPrice != null ? (
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(displayPrice)} <span className="text-base font-normal text-muted-foreground">/ día</span>
              </p>
            ) : hasPriceRange ? (
              <p className="text-3xl font-bold text-primary">
                <span className="text-lg font-normal text-muted-foreground">Desde </span>
                {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
                <span className="text-base font-normal text-muted-foreground"> / día</span>
              </p>
            ) : (
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(product.rental_price)} <span className="text-base font-normal text-muted-foreground">/ día</span>
              </p>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="font-bold mb-2">Descripción</h3>
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
                   {/* Size Selector */}
          {variants.length > 0 && (
            <div>
              <h3 className="font-bold mb-3 uppercase tracking-wider text-xs text-muted-foreground">Selecciona tu talla</h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((v: any) => {
                  const isDisabled = v.in_maintenance || v.stock <= 0;
                  const isSelected = selectedSize === v.size;
                  return (
                    <button
                      key={v.size}
                      onClick={() => !isDisabled && setSelectedSize(isSelected ? null : v.size)}
                      disabled={isDisabled}
                      className={`
                        relative px-5 py-2 rounded-full border text-sm font-medium transition-all duration-150
                        ${isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : isDisabled
                            ? "bg-muted/30 text-muted-foreground/40 border-border/40 cursor-not-allowed"
                            : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                        }
                      `}
                    >
                      {v.size}
                      {isDisabled && v.in_maintenance && (
                        <AlertTriangle className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedSize && selectedVariant && (
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  ✓ {selectedVariant.stock} disponible{selectedVariant.stock !== 1 ? "s" : ""} en talla {selectedSize}
                </p>
              )}
            </div>
          )}

          {/* Date Selector */}
          {selectedSize ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="font-bold mb-3 uppercase tracking-wider text-xs text-muted-foreground">Fechas de Alquiler</h3>
              <AvailabilityCalendar
                productId={product._id}
                selectedSize={selectedSize}
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
          ) : (
            <div className="p-6 border-2 border-dashed border-black/10 rounded-2xl bg-muted/20 flex flex-col items-center text-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Disponibilidad</p>
                <p className="text-xs text-muted-foreground">Selecciona una talla primero para ver las fechas disponibles en el calendario.</p>
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <h3 className="font-bold mb-3 uppercase tracking-wider text-xs text-muted-foreground">Cantidad</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const max = selectedVariant ? getAvailableStock(product._id, selectedSize!, selectedVariant.stock) : 99;
                      if (!isNaN(val)) {
                        setQuantity(Math.min(Math.max(1, val), max));
                      }
                    }}
                    className="w-12 text-center font-bold border-none focus:ring-0"
                  />
                  <button
                    onClick={() => {
                      const max = selectedVariant ? getAvailableStock(product._id, selectedSize!, selectedVariant.stock) : 99;
                      setQuantity(Math.min(max, quantity + 1));
                    }}
                    className="p-2 hover:bg-muted transition-colors rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {selectedVariant && (
                  <span className="text-xs text-muted-foreground">
                    Disponibles: {getAvailableStock(product._id, selectedSize!, selectedVariant.stock)} unidades
                  </span>
                )}
              </div>
              {selectedVariant && getAvailableStock(product._id, selectedSize!, selectedVariant.stock) === 0 && (
                <p className="text-[10px] text-destructive font-bold animate-pulse">
                  * Has agotado el stock disponible para esta sesión (ya en carrito).
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <CardContent className="p-0 flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Stock Total</p>
                  <p className="font-bold">{totalStock} disponible{totalStock !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardContent className="p-0 flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Tallas</p>
                  <p className="font-bold">{availableVariants.length} disponible{availableVariants.length !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          {isAvailable ? (
            <Button
              size="lg"
              className="w-full py-6 text-lg font-semibold shadow-md"
              disabled={!selectedSize || !startDate || !endDate || calendarConflict}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              {!selectedSize ? "Selecciona talla" : !startDate || !endDate ? "Selecciona fechas" : "Añadir al Carrito"}
            </Button>
          ) : (
            <Button size="lg" className="w-full grayscale" disabled>
              Agotado Temporalmente
            </Button>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Debes iniciar sesión para reservar.
            </p>
          )}
        </div>
      </div>
      {/* Add to Cart Confirmation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="max-w-sm w-full shadow-elegant-lg bg-white p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>¡Añadido exitosamente!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu reserva ha sido agregada al carrito.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button className="w-full" onClick={() => navigate("/cart")}>
                  Ir al Carrito
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowAddModal(false)}>
                  Seguir Comprando
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
