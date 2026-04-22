import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, ShoppingBag, Package } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  pollera: "Polleras",
  vestuario_masculino: "Vestuario Masculino",
  infantil: "Infantil",
  tembleques: "Tembleques",
  accesorios: "Accesorios",
  paquete_completo: "Paquetes Completos",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  disponible: { label: "Disponible", variant: "default" },
  mantenimiento: { label: "En Mantenimiento", variant: "destructive" },
  alquilado: { label: "Alquilado", variant: "secondary" },
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

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
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
        <Button onClick={() => navigate("/catalog")}>Volver al Catalogo</Button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[product.condition_status] || { label: product.condition_status, variant: "secondary" as const };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/catalog")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Catalogo
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-muted">
              <img
                src={product.images?.[selectedImage] || "https://picsum.photos/seed/default/600/800"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
          {product.images?.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                    selectedImage === i ? "border-primary" : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{CATEGORY_LABELS[product.category]}</Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              {product.name}
            </h1>
            <p className="text-3xl font-bold text-primary">${product.rental_price} <span className="text-base font-normal text-muted-foreground">/ dia</span></p>
          </div>

          <Separator />

          <div>
            <h3 className="font-bold mb-2">Descripcion</h3>
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {product.size && (
              <Card className="p-4">
                <CardContent className="p-0 flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Talla</p>
                    <p className="font-bold">{product.size}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="p-4">
              <CardContent className="p-0 flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="font-bold">{product.stock} disponible(s)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* CTA */}
          {product.condition_status === "disponible" ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                } else {
                  navigate(`/checkout/${product._id}`);
                }
              }}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Reservar Este Producto
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              No Disponible
            </Button>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Debes iniciar sesion para reservar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
