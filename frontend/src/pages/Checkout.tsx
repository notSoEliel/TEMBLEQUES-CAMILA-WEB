import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsApi, rentalsApi, stripeApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Shield, CreditCard, Loader2 } from "lucide-react";

export default function Checkout() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (productId) {
      productsApi.get(productId).then((data) => {
        setProduct(data.product);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [productId, user]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
  };

  const totalPrice = product ? calculateDays() * product.rental_price : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!startDate || !endDate) {
      setError("Selecciona las fechas de alquiler.");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("La fecha de inicio debe ser anterior a la fecha de fin.");
      return;
    }

    if (new Date(startDate) < new Date()) {
      setError("La fecha de inicio no puede ser en el pasado.");
      return;
    }

    if (!termsAccepted) {
      setError("Debes aceptar los terminos y condiciones para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      // Create rental
      const rentalData = await rentalsApi.create({
        productId: productId!,
        startDate,
        endDate,
        termsAccepted,
      }, token!);

      // Process payment (demo or Stripe)
      const paymentResult = await stripeApi.createCheckoutSession(rentalData.rental._id, token!);

      if (paymentResult.url) {
        // Real Stripe - redirect
        window.location.href = paymentResult.url;
      } else {
        // Demo mode - go to confirmation
        navigate(`/confirmation?rental=${rentalData.rental._id}`);
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar la reserva.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
        <Button onClick={() => navigate("/catalog")}>Volver al Catalogo</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
        Reservar Producto
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Summary */}
            <Card>
              <CardContent className="p-6 flex gap-4">
                <img
                  src={product.images?.[0] || "https://picsum.photos/seed/default/200/250"}
                  alt={product.name}
                  className="w-24 h-32 object-cover rounded-lg border-2 border-border"
                />
                <div>
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                  <p className="text-lg font-bold text-primary mt-2">${product.rental_price}/dia</p>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Seleccionar Fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Fecha de Inicio</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Fecha de Devolucion</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                </div>
                {calculateDays() > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Duracion: <strong>{calculateDays()} dia(s)</strong>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Terminos y Condiciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 border-2 border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
                  <p className="mb-2">El cliente acepta devolver el producto en las mismas condiciones en que fue entregado.</p>
                  <p className="mb-2">En caso de perdida, dano, rotura, manchas permanentes o deterioro causado durante el alquiler, el cliente asume la responsabilidad total del costo de reparacion o reposicion.</p>
                  <p className="mb-2">Si el alquiler corresponde unicamente a accesorios (tembleques, peinetas, joyeria, etc.), el cliente sera responsable en su totalidad por cualquier dano o perdida del articulo.</p>
                  <p>Retrasos en devolucion podran generar cargos adicionales.</p>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    data-testid="terms-checkbox"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    He leido y acepto los terminos y condiciones de alquiler. Entiendo mi responsabilidad sobre el cuidado del producto.
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumen de Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Producto</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                {product.size && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Talla</span>
                    <span className="font-medium">{product.size}</span>
                  </div>
                )}
                {calculateDays() > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duracion</span>
                      <span className="font-medium">{calculateDays()} dia(s)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Precio por dia</span>
                      <span className="font-medium">${product.rental_price}</span>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex justify-between">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-primary">
                    ${totalPrice > 0 ? totalPrice : "--"}
                  </span>
                </div>

                {error && (
                  <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting || !termsAccepted || !startDate || !endDate}
                  data-testid="checkout-button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar ${totalPrice > 0 ? totalPrice : "--"}
                    </>
                  )}
                </Button>

                {!termsAccepted && startDate && endDate && (
                  <p className="text-xs text-center text-destructive">
                    Debes aceptar los terminos para continuar.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
