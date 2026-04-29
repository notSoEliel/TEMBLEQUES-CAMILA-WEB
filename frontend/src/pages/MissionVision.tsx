import { Separator } from "@/components/ui/separator";
import { Target, Eye, Heart } from "lucide-react";

export default function MissionVision() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="text-primary font-black uppercase tracking-[0.3em] text-xs mb-6 block animate-in fade-in slide-in-from-bottom-4 duration-700">
          Nuestro Propósito
        </span>
        <h1 className="text-5xl md:text-7xl font-display font-black text-foreground tracking-tight leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          Forjando el futuro del <br /> <span className="text-primary italic">lujo cultural.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
          En Tembleques Camila, no solo alquilamos vestimenta; custodiamos una herencia 
          que merece ser lucida con la máxima distinción y respeto.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 mb-24">
        <Separator className="bg-border/40 mb-24" />
        
        {/* Misión */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-32">
          <div className="md:col-span-5 space-y-8">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Target className="h-7 w-7" />
            </div>
            <h2 className="text-4xl font-display font-black tracking-tighter leading-tight">
              Nuestra <br /> Misión.
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg font-medium italic border-l-4 border-primary/20 pl-6">
              "Digitalizar y elevar la experiencia de acceso a la indumentaria folclórica panameña, 
              garantizando piezas de calidad museo y un servicio que honre la tradición."
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Buscamos eliminar las barreras logísticas para que cada panameña y amante 
              de nuestra cultura pueda vestir con orgullo piezas auténticas, mantenidas 
              bajo los más estrictos estándares de conservación.
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="aspect-[16/9] bg-muted rounded-[2rem] overflow-hidden shadow-elegant-lg relative group">
              <div className="w-full h-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-700" />
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-display text-2xl">
                Compromiso con la Excelencia
              </div>
            </div>
          </div>
        </div>

        {/* Visión */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-32">
          <div className="md:col-span-7 order-2 md:order-1">
            <div className="aspect-[16/9] bg-muted rounded-[2rem] overflow-hidden shadow-elegant-lg relative group">
              <div className="w-full h-full bg-accent/5 group-hover:bg-accent/10 transition-colors duration-700" />
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-display text-2xl">
                Liderazgo Folclórico Digital
              </div>
            </div>
          </div>
          <div className="md:col-span-5 order-1 md:order-2 space-y-8 md:pl-12">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6">
              <Eye className="h-7 w-7" />
            </div>
            <h2 className="text-4xl font-display font-black tracking-tighter leading-tight">
              Nuestra <br /> Visión.
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg font-medium italic border-l-4 border-accent/20 pl-6">
              "Ser el referente global del e-commerce folclórico panameño, reconocido por 
              la autenticidad de nuestras piezas y la innovación en la gestión cultural."
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Proyectamos un futuro donde Tembleques Camila sea sinónimo de orgullo nacional, 
              expandiendo nuestro alcance para que el folklore panameño sea admirado y 
              accesible en cualquier rincón del mundo con un clic.
            </p>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-muted/30 rounded-[3rem] p-12 md:p-20 mb-32 border border-border/20">
          <div className="text-center mb-16 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
              <Heart className="h-7 w-7" />
            </div>
            <h2 className="text-4xl font-display font-black tracking-tighter">Valores que nos definen</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { t: "Autenticidad", d: "Respeto inquebrantable por las técnicas artesanales tradicionales." },
              { t: "Excelencia", d: "Atención al detalle en cada puntada, perla y proceso de limpieza." },
              { t: "Innovación", d: "Transformamos la tradición a través de la tecnología para el mundo actual." }
            ].map((v, i) => (
              <div key={i} className="space-y-4 text-center">
                <h4 className="text-2xl font-display font-bold">{v.t}</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">{v.d}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/40 mt-24 mb-24" />
      </div>
    </div>
  );
}
