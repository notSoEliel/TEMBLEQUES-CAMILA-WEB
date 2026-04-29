import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "¿Cómo funciona el proceso de alquiler?",
    a: "El proceso es simple: eliges tu pieza en el catálogo, seleccionas las fechas de tu evento, realizas el abono de reserva y ¡listo! Te entregamos la pieza limpia y lista para lucir."
  },
  {
    q: "¿Con cuánta anticipación debo reservar?",
    a: "Recomendamos reservar al menos con 2 a 4 semanas de anticipación, especialmente durante los meses de noviembre y festividades nacionales, para garantizar la disponibilidad de tu diseño favorito."
  },
  {
    q: "¿Qué sucede si la pieza sufre algún daño?",
    a: "Entendemos que pueden ocurrir accidentes menores. Contamos con un seguro de limpieza básica incluido. Sin embargo, daños mayores o pérdida de piezas (como perlas o cristales específicos) pueden incurrir en cargos adicionales según nuestros términos y condiciones."
  },
  {
    q: "¿Realizan envíos a domicilio?",
    a: "Sí, contamos con servicio de entrega y recogida en la Ciudad de Panamá. Para envíos al interior del país, utilizamos servicios de mensajería externa con un costo adicional."
  },
  {
    q: "¿Cuáles son los métodos de pago aceptados?",
    a: "Aceptamos pagos con tarjetas de crédito y débito a través de nuestra plataforma segura (Stripe), transferencias bancarias directas y Yappy."
  },
  {
    q: "¿Cómo debo cuidar los tembleques mientras los tengo?",
    a: "Debes mantenerlos en su caja original, lejos de la humedad y el calor directo. No apliques perfume o spray para el cabello directamente sobre las piezas, ya que esto puede opacar los cristales y perlas."
  }
];

export default function FAQ() {
  return (
    <div className="bg-background min-h-screen py-24 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-relaxed py-2">
            Preguntas <span className="text-primary underline decoration-primary/20 underline-offset-8">Frecuentes</span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Todo lo que necesitas saber para vivir una experiencia folclórica inolvidable.
          </p>
        </div>

        <Separator className="bg-border/40" />

        {/* Accordion */}
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem 
              key={i} 
              value={`item-${i}`}
              className="border border-border/40 rounded-[1.5rem] px-6 overflow-hidden bg-card/30 backdrop-blur-sm transition-all duration-300 data-[state=open]:shadow-elegant data-[state=open]:border-primary/20"
            >
              <AccordionTrigger className="text-left font-bold text-lg py-6 hover:text-primary hover:no-underline transition-colors">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6 text-base">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Footer Note */}
        <div className="text-center pt-12 space-y-4">
          <p className="text-muted-foreground font-medium">¿Aún tienes dudas?</p>
          <a 
            href="/contact" 
            className="inline-block bg-primary text-white font-bold px-8 py-3 rounded-full shadow-elegant hover:scale-105 transition-transform active:scale-95"
          >
            Contáctanos directamente
          </a>
        </div>
      </div>
    </div>
  );
}
