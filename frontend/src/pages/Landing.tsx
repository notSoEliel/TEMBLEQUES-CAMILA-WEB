import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Calendar, CreditCard, CheckCircle, Star, HelpCircle } from "lucide-react";

const CATEGORIES = [
  { name: "Polleras", image: "https://picsum.photos/seed/cat-pollera/400/500", slug: "pollera" },
  { name: "Vestuario Masculino", image: "https://picsum.photos/seed/cat-masc/400/500", slug: "vestuario_masculino" },
  { name: "Infantil", image: "https://picsum.photos/seed/cat-infantil/400/500", slug: "infantil" },
  { name: "Tembleques", image: "https://picsum.photos/seed/cat-tembleques/400/500", slug: "tembleques" },
  { name: "Accesorios", image: "https://picsum.photos/seed/cat-accesorios/400/500", slug: "accesorios" },
  { name: "Paquetes Completos", image: "https://picsum.photos/seed/cat-paquete/400/500", slug: "paquete_completo" },
];

const STEPS = [
  { icon: Calendar, title: "Elige tus Fechas", description: "Selecciona el periodo de alquiler en nuestro calendario." },
  { icon: CreditCard, title: "Paga Seguro", description: "Realiza tu pago de forma segura con Stripe." },
  { icon: CheckCircle, title: "Recibe y Luce", description: "Recoge tu vestuario y luce la tradicion panamena." },
];

const TESTIMONIALS = [
  { name: "Ana Garcia", text: "El proceso de reserva fue increiblemente facil. La pollera estaba en condiciones impecables.", rating: 5 },
  { name: "Carlos Mendoza", text: "Alquile el traje tipico masculino para el desfile. Excelente calidad y servicio.", rating: 5 },
  { name: "Maria Fernandez", text: "Los tembleques eran hermosos. Sin duda volvere a alquilar para el proximo evento.", rating: 4 },
];

const FAQS = [
  { q: "Como funciona el alquiler?", a: "Seleccionas el producto, eliges las fechas, aceptas los terminos y pagas en linea. Asi de facil." },
  { q: "Que pasa si se dana la prenda?", a: "El cliente asume la responsabilidad total del costo de reparacion o reposicion segun los terminos aceptados." },
  { q: "Cuanto tiempo dura el alquiler?", a: "Tu eliges las fechas. El precio se calcula por dia de alquiler." },
  { q: "Puedo cancelar mi reserva?", a: "Las reservas pueden cancelarse antes de la entrega. Consulta los terminos para detalles sobre reembolsos." },
];

export default function Landing() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              La tradicion se luce mejor cuando se{" "}
              <span className="text-primary italic">reserva facil.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl">
              Alquila vestimenta tipica panamena y accesorios folcloricos con la elegancia que mereces. Reserva en minutos, luce con orgullo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/catalog">
                  Reservar Ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/catalog">Ver Catalogo</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-40 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
      </section>

      {/* Featured Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Catalogo Destacado
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Desde la majestuosa pollera de gala hasta los delicados tembleques artesanales.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} to={`/catalog?category=${cat.slug}`}>
              <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-1">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-center">{cat.name}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Reserva en Minutos
          </h2>
          <p className="text-muted-foreground">Tres pasos simples para lucir la tradicion panamena.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <Card key={i} className="text-center p-8 transition-all hover:-translate-y-1">
              <CardContent className="p-0 space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-3xl font-bold text-muted-foreground/30">{`0${i + 1}`}</div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="max-w-7xl mx-auto" />

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-muted/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Testimonios
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="p-6">
              <CardContent className="p-0 space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">"{t.text}"</p>
                <p className="font-bold text-sm">{t.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Preguntas Frecuentes
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, i) => (
            <Card key={i} className="p-6">
              <CardContent className="p-0">
                <div className="flex gap-3">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <h2
            className="text-3xl lg:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Alquila tradicion panamena con elegancia
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            No es solo alquiler de ropa. Es alquiler premium de identidad cultural panamena con gestion digital profesional.
          </p>
          <Button size="lg" variant="outline" className="bg-white text-primary border-white hover:bg-white/90" asChild>
            <Link to="/catalog">
              Reservar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
