import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n";

export default function History() {
  const { t } = useI18n();

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="text-primary font-black uppercase tracking-[0.3em] text-xs mb-6 block animate-in fade-in slide-in-from-bottom-4 duration-700">
          {t("history.badge")}
        </span>
        <h1 className="text-5xl md:text-7xl font-display font-black text-foreground tracking-tight leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          {t("history.title")} <br /> {t("language.label") === "Idioma" ? "con el" : "with"} <span className="text-primary italic">{t("history.titleAccent")}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
          {t("history.subtitle")}
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 mb-24">
        <Separator className="bg-border/40 mb-24" />
        
        {/* Editorial Layout Section 1 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-32">
          <div className="md:col-span-5 space-y-8">
            <h2 className="text-4xl font-display font-black tracking-tighter leading-tight">
              {t("history.sec1Title")} <br /> {t("history.sec1TitleAccent")}
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                {t("history.sec1Text1")}
              </p>
              <p>
                {t("history.sec1Text2")}
              </p>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="aspect-[16/9] bg-muted rounded-[2rem] overflow-hidden shadow-elegant-lg group relative">
              <img 
                src="/inicios.JPG" 
                alt="Artesanía en proceso" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors duration-700 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Editorial Layout Section 2 (Inverted) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-32">
          <div className="md:col-span-7 order-2 md:order-1">
            <div className="aspect-[3/4] md:aspect-[4/5] bg-muted rounded-[2rem] overflow-hidden shadow-elegant-lg relative group">
              <img 
                src="/evolucion.jpg" 
                alt="Elegancia Folclórica Premium" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-accent/5 group-hover:bg-transparent transition-colors duration-700 pointer-events-none" />
            </div>
          </div>
          <div className="md:col-span-5 order-1 md:order-2 space-y-8 md:pl-12">
            <h2 className="text-4xl font-display font-black tracking-tighter leading-tight">
              {t("history.sec2Title")} <br /> {t("history.sec2TitleAccent")}
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                {t("history.sec2Text1")}
              </p>
              <p className="font-serif italic text-xl text-primary">
                {t("history.sec2Quote")}
              </p>
              <p>
                {t("history.sec2Text2")}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-border/40 mt-24 mb-24" />
        
        {/* Closing Quote */}
        <section className="text-center max-w-3xl mx-auto pb-24">
          <h3 className="text-3xl font-display italic mb-8 text-foreground/80">
            {t("history.closingQuote")}
          </h3>
          <div className="inline-flex items-center gap-4 text-primary font-bold tracking-widest text-sm uppercase">
            <span>{t("history.tag1")}</span>
            <div className="w-8 h-px bg-primary/30" />
            <span>{t("history.tag2")}</span>
            <div className="w-8 h-px bg-primary/30" />
            <span>{t("history.tag3")}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
