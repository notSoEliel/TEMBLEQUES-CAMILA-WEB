import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Eye, Calendar, Package, ShoppingBag, ArrowLeft } from "lucide-react";
import type { SizeVariant } from "@/components/SizeManager";
import { useI18n } from "@/i18n";
import { getLocalizedCategoryLabel, getLocalizedText } from "@/lib/utils";
import type { ICategoryConfig } from "@/types";

interface ProductPreviewData {
  name: string;
  name_en?: string;
  category: string[];
  description: string;
  description_en?: string;
  rental_price: number;
  variants: SizeVariant[];
  images: string[];
}

interface ProductPreviewProps {
  product: ProductPreviewData;
  categories?: ICategoryConfig[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductPreview({ product, categories = [], isOpen, onClose }: ProductPreviewProps) {
  const { language } = useI18n();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const availableVariants = product.variants.filter((v) => !v.in_maintenance && v.stock > 0);
  const prices = product.variants.map((v) => v.price_override ?? product.rental_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasPriceRange = minPrice !== maxPrice;

  const selectedVariant = product.variants.find((v) => v.size === selectedSize);
  const displayPrice = selectedVariant
    ? selectedVariant.price_override ?? product.rental_price
    : null;

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-PA", { style: "currency", currency: "PAB" }).format(amount);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (kept for transition, though modal covers it) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 overflow-auto bg-background"
          >
            {/* Floating badge + close */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/90 backdrop-blur-md border-b border-border">
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-bold gap-1.5">
                <Eye className="h-3 w-3" />
                Vista Previa
              </Badge>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-muted/60 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* ── Images ── */}
                <div className="space-y-4">
                  <Card className="overflow-hidden relative group">
                    <div className="aspect-[3/4] bg-muted relative">
                      {product.images.length > 0 ? (
                        <>
                          <img
                            src={product.images[selectedImage] || product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          {product.images.length > 1 && (
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
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Package className="h-16 w-16 opacity-30" />
                        </div>
                      )}
                    </div>
                  </Card>
                  
                  {product.images.length > 1 && (
                    <div className="relative">
                      <div
                        className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-hide"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      >
                        {product.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImage(i)}
                            className={`w-20 h-20 rounded-xl border overflow-hidden transition-all shrink-0 snap-start ${
                              selectedImage === i
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border/60 opacity-70 hover:opacity-100"
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

                {/* ── Details ── */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        {product.category.map((cat) => {
                          const configuredCategory = categories.find((item) => item.id === cat);
                          const label = getLocalizedCategoryLabel(cat, configuredCategory, language);
                          return <Badge key={cat} variant="outline">{label}</Badge>;
                        })}
                      </div>
                      {availableVariants.length > 0 ? (
                        <Badge variant="default">Disponible</Badge>
                      ) : (
                        <Badge variant="destructive">No Disponible</Badge>
                      )}
                    </div>
                    <h1
                      className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {getLocalizedText(product.name || "Sin nombre", product.name_en, language)}
                    </h1>

                    {/* Price */}
                    {selectedSize && displayPrice != null ? (
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(displayPrice)}{" "}
                        <span className="text-base font-normal text-muted-foreground">/ día</span>
                      </p>
                    ) : hasPriceRange ? (
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}{" "}
                        <span className="text-base font-normal text-muted-foreground">/ día</span>
                      </p>
                    ) : (
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(product.rental_price)}{" "}
                        <span className="text-base font-normal text-muted-foreground">/ día</span>
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Description */}
                  <div>
                    <h3 className="font-bold mb-2">Descripción</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {getLocalizedText(product.description || "Sin descripción.", product.description_en, language)}
                    </p>
                  </div>

                  {/* Size selector */}
                  {product.variants.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-3">Tallas disponibles</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => {
                          const isDisabled = v.in_maintenance || v.stock <= 0;
                          const isSelected = selectedSize === v.size;
                          return (
                            <button
                              key={v.size}
                              onClick={() => setSelectedSize(isSelected ? null : v.size)}
                              disabled={isDisabled}
                              className={`
                                px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150
                                ${isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : isDisabled
                                    ? "bg-muted/30 text-muted-foreground/40 border-border/40 cursor-not-allowed line-through"
                                    : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                                }
                              `}
                            >
                              {v.size}
                              {v.price_override && v.price_override !== product.rental_price && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({formatCurrency(v.price_override)})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedSize && selectedVariant && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Stock: {selectedVariant.stock} disponible{selectedVariant.stock !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <CardContent className="p-0 flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Stock Total</p>
                          <p className="font-bold">{totalStock} unidad{totalStock !== 1 ? "es" : ""}</p>
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

                  {/* CTA — visible but non-functional */}
                  <Button size="lg" className="w-full" disabled>
                    <Calendar className="h-5 w-5 mr-2" />
                    Reservar Este Producto
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Este es un modo de vista previa. El botón de reserva no está activo.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
