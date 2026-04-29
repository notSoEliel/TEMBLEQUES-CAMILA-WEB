import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  CheckCircle,
  Star,
  ChevronDown,
  Shirt,
  Crown,
  Baby,
  Sparkles,
  Gift,
  Flower,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const CATEGORIES = [
  { name: "Polleras", slug: "pollera", icon: Crown, description: "Vestimenta nacional de gala", gradient: "from-rose-100 to-pink-50", iconColor: "text-rose-500" },
  { name: "Vestuario Masculino", slug: "vestuario_masculino", icon: Shirt, description: "Trajes típicos de caballero", gradient: "from-fuchsia-100 to-purple-50", iconColor: "text-fuchsia-600" },
  { name: "Infantil", slug: "infantil", icon: Baby, description: "Para los más pequeños", gradient: "from-pink-100 to-rose-50", iconColor: "text-pink-500" },
  { name: "Tembleques", slug: "tembleques", icon: Flower, description: "Accesorios artesanales", gradient: "from-red-100 to-rose-50", iconColor: "text-red-500" },
  { name: "Accesorios", slug: "accesorios", icon: Sparkles, description: "Complementos folclóricos", gradient: "from-primary/10 to-secondary/30", iconColor: "text-primary" },
  { name: "Paquetes Completos", slug: "paquete_completo", icon: Gift, description: "Todo lo que necesitas", gradient: "from-pink-100 to-fuchsia-50", iconColor: "text-pink-600" },
];

const STEPS = [
  { icon: Calendar, title: "Elige tus Fechas", description: "Selecciona el periodo de alquiler en nuestro calendario interactivo.", number: "01" },
  { icon: CreditCard, title: "Paga Seguro", description: "Realiza tu pago de forma segura con Stripe. Protección garantizada.", number: "02" },
  { icon: CheckCircle, title: "Recibe y Luce", description: "Recoge tu vestuario y luce la tradición panameña con orgullo.", number: "03" },
];

const TESTIMONIALS = [
  { name: "Ana García", role: "Cliente frecuente", text: "El proceso de reserva fue increíblemente fácil. La pollera estaba en condiciones impecables.", rating: 5, initial: "A" },
  { name: "Carlos Mendoza", role: "Evento corporativo", text: "Alquilé el traje típico masculino para el desfile. Excelente calidad y atención al detalle.", rating: 5, initial: "C" },
  { name: "María Fernández", role: "Madre de familia", text: "Los tembleques eran hermosos. Sin duda volveré a alquilar para el próximo evento cultural.", rating: 4, initial: "M" },
];

const FAQS = [
  { q: "¿Cómo funciona el alquiler?", a: "Seleccionas el producto, eliges las fechas, aceptas los términos y pagas en línea. Así de fácil." },
  { q: "¿Qué pasa si se daña la prenda?", a: "El cliente asume la responsabilidad total del costo de reparación o reposición según los términos aceptados." },
  { q: "¿Cuánto tiempo dura el alquiler?", a: "Tú eliges las fechas. El precio se calcula por día de alquiler." },
  { q: "¿Puedo cancelar mi reserva?", a: "Las reservas pueden cancelarse antes de la entrega. Consulta los términos para detalles sobre reembolsos." },
];

export default function Landing() {

  return (
    <div className="overflow-hidden">

      {/* ==================== HERO ==================== */}
      {/* Contenedor con padding lateral, esquinas redondeadas igual a la referencia */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-0">
        <div
          className="relative w-full overflow-hidden rounded-3xl"
          style={{ minHeight: "520px" }}
        >
          {/* ── Fondo: foto real de la mujer con traje folclórico ── */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: "url('/hero.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "center right",
              backgroundRepeat: "no-repeat",
            }}
          />

          {/* ── Gradiente exacto del Figma ──
               De derecha (transparente) hacia la izquierda (rosa sólido F2CBDE)
               Ángulo -88.7138deg ≈ de derecha a izquierda */}
          <div
            className="absolute inset-0 z-10"
            style={{
              backgroundImage:
                "linear-gradient(-88.7138deg, rgba(244, 206, 224, 0) 1.0724%, rgb(242, 203, 222) 39.958%)",
            }}
          />

          {/* ── Contenido del hero ── */}
          <div className="relative z-20 flex flex-col justify-center h-full px-8 sm:px-12 lg:px-16 py-16 lg:py-24 max-w-xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground mb-5 font-serif"
            >
              La tradición se luce mejor cuando se{" "}
              <span
                className="block italic font-script text-primary text-[1.2em] leading-[1.1] mt-[0.2em]"
              >
                reserva fácil
              </span>
            </h1>

            <p
              className="text-base text-foreground/80 mb-8 max-w-xs leading-relaxed font-medium"
            >
              Alquila vestimenta típica panameña y accesorios folclóricos con la elegancia que mereces. Reserva en minutos, luce con orgullo.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="shadow-lg font-semibold px-8 h-14 text-base">
                <Link to="/catalog">Reservar ahora</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="bg-white/40 backdrop-blur-md font-semibold px-8 h-14 text-base border-primary/20 hover:bg-white/60"
              >
                <Link to="/catalog">Ver catálogo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>


      {/* ==================== CATEGORÍAS ==================== */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">Nuestro Catálogo</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground font-serif">
              Catálogo Destacado
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Desde la majestuosa pollera de gala hasta los delicados tembleques artesanales.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
            {CATEGORIES.map((cat) => (
              <Link key={cat.slug} to={`/catalog?category=${cat.slug}`}>
                <Card className="group overflow-hidden hover:shadow-elegant-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <CardContent className="p-0">
                    <div className={`aspect-[4/3] bg-gradient-to-br ${cat.gradient} flex items-center justify-center relative overflow-hidden`}>
                      <cat.icon className={`h-16 w-16 ${cat.iconColor} opacity-60 transition-all duration-300 group-hover:scale-110 group-hover:opacity-80`} />
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/20" />
                      <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/15" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ==================== CÓMO FUNCIONA ==================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">Proceso Simple</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground font-serif">
              Reserva en Minutos
            </h2>
            <p className="text-muted-foreground">Tres pasos simples para lucir la tradición panameña.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative text-center group">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] right-0 h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}
                <Card className="p-8 hover:shadow-elegant-lg transition-all duration-300 hover:-translate-y-1 relative z-10">
                  <CardContent className="p-0 space-y-5">
                    <div className="text-6xl font-bold text-primary/8 mb-3 font-serif">
                      {step.number}
                    </div>
                    <div className="w-14 h-14 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground font-serif">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ==================== TESTIMONIALES ==================== */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">Clientes Felices</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground font-serif">
              Lo Que Dicen de Nosotros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="p-7 hover:shadow-elegant-lg transition-all duration-200">
                <CardContent className="p-0 space-y-5">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-4 w-4 ${j < t.rating ? "fill-primary text-primary" : "fill-muted text-muted"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-9 w-9 rounded-full bg-primary/12 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{t.initial}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ==================== FAQ ==================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">Preguntas Frecuentes</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground font-serif">
              ¿Tienes Dudas?
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-2 border-border rounded-3xl bg-card px-2 overflow-hidden shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
                <AccordionTrigger className="px-4 text-left font-bold text-sm hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="relative overflow-hidden">
        <div className="bg-brand-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center relative z-10">
            <div className="flex justify-center mb-8 opacity-30">
              <Flower className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-5 text-white font-serif">
              Alquila tradición panameña con elegancia
            </h2>
            <p className="text-lg mb-10 text-white/80 max-w-2xl mx-auto leading-relaxed">
              No es solo alquiler de ropa. Es alquiler premium de identidad cultural panameña con gestión digital profesional.
            </p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl border-0 font-semibold" asChild>
              <Link to="/catalog">
                Reservar Ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>
      </section>
    </div>
  );
}
