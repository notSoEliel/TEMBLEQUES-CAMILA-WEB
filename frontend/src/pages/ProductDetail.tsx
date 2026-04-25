import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, ShoppingBag, Package, AlertTriangle } from "lucide-react";
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
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

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

  function handleReserve() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!selectedSize) return;
    navigate(`/checkout/${product._id}`, { state: { selectedSize } });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
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
                    className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-all shrink-0 snap-start ${
                      selectedImage === i ? "border-primary ring-2 ring-primary/20" : "border-border opacity-70 hover:opacity-100"
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
              <h3 className="font-bold mb-3">Selecciona tu talla</h3>
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
                        relative px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-150
                        ${isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : isDisabled
                            ? "bg-muted/30 text-muted-foreground/40 border-border/50 cursor-not-allowed"
                            : "bg-card text-foreground border-border hover:border-primary"
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
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedVariant.stock} disponible{selectedVariant.stock !== 1 ? "s" : ""} en talla {selectedSize}
                </p>
              )}
              {!selectedSize && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selecciona una talla para continuar.
                </p>
              )}
            </div>
          )}

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

          <Separator />

          {/* CTA */}
          {isAvailable ? (
            <Button
              size="lg"
              className="w-full"
              disabled={!selectedSize}
              onClick={handleReserve}
            >
              <Calendar className="h-5 w-5 mr-2" />
              {selectedSize ? "Reservar Este Producto" : "Selecciona una talla"}
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              No Disponible
            </Button>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Debes iniciar sesión para reservar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
