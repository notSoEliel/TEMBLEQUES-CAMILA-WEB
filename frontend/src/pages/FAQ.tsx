import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";
import { useI18n } from "@/i18n";

export default function FAQ() {
  const { t } = useI18n();
  const faqs = [1, 2, 3, 4, 5, 6].map((item) => ({
    q: t(`faq.q${item}`),
    a: t(`faq.a${item}`),
  }));

  return (
    <div className="bg-background min-h-screen py-24 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-relaxed py-2">
            {t("faq.titleA")} <span className="text-primary underline decoration-primary/20 underline-offset-8">{t("faq.titleB")}</span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            {t("faq.subtitle")}
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
          <p className="text-muted-foreground font-medium">{t("faq.more")}</p>
          <a 
            href="/contacto" 
            className="inline-block bg-primary text-white font-bold px-8 py-3 rounded-full shadow-elegant hover:scale-105 transition-transform active:scale-95"
          >
            {t("faq.contact")}
          </a>
        </div>
      </div>
    </div>
  );
}
