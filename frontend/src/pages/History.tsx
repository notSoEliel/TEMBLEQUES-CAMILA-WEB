import { Separator } from "@/components/ui/separator";

export default function History() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="text-primary font-black uppercase tracking-[0.3em] text-xs mb-6 block animate-in fade-in slide-in-from-bottom-4 duration-700">
          Nuestra Esencia
        </span>
        <h1 className="text-5xl md:text-7xl font-display font-black text-foreground tracking-tight leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          Un legado tejido <br /> con el <span className="text-primary italic">corazón.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
          Tembleques Camila nació de la necesidad de preservar la belleza de nuestro folklore, 
          llevando la tradición panameña a una nueva era de elegancia y sofisticación.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 mb-24">
        <Separator className="bg-border/40 mb-24" />
        
        {/* Editorial Layout Section 1 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-32">
          <div className="md:col-span-5 space-y-8">
            <h2 className="text-4xl font-display font-black tracking-tighter leading-tight">
              El origen de la <br /> delicadeza.
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Todo comenzó en un pequeño taller familiar, donde la pasión por el detalle 
                y el respeto por los artesanos locales se convirtieron en nuestra brújula. 
                Vimos en el tembleque no solo un adorno, sino una corona de identidad.
              </p>
              <p>
                Nuestra misión ha sido democratizar el acceso a piezas de calidad premium, 
                permitiendo que cada mujer panameña brille con la autenticidad que merece 
                en sus momentos más especiales.
              </p>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="aspect-[16/9] bg-muted rounded-[2rem] overflow-hidden shadow-elegant-lg group relative">
              <div className="w-full h-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-700" />
              {/* Image Placeholder Context: Representing a traditional workshop with focus on detail */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-display text-2xl">
                Artesanía en proceso
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Layout Section 2 (Inverted) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-32">
          <div className="md:col-span-7 order-2 md:order-1">
            <div className="aspect-[3/4] md:aspect-[4/5] bg-muted rounded-[2rem] overflow-hidden shadow-elegant-lg relative group">
              <div className="w-full h-full bg-accent/5 group-hover:bg-accent/10 transition-colors duration-700" />
              {/* Image Placeholder Context: High-end portrait of a woman wearing a pollera and tembleques */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-display text-2xl text-center px-8">
                Elegancia Folclórica Premium
              </div>
            </div>
          </div>
          <div className="md:col-span-5 order-1 md:order-2 space-y-8 md:pl-12">
            <h2 className="text-4xl font-display font-black tracking-tighter leading-tight">
              Evolución y <br /> Compromiso.
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Hoy, Tembleques Camila es más que una tienda de alquiler. Es un puente 
                entre el pasado glorioso de Panamá y un futuro donde la cultura se vive 
                con orgullo y modernidad.
              </p>
              <p className="font-serif italic text-xl text-primary">
                "La tradición no es la adoración de las cenizas, sino la preservación del fuego."
              </p>
              <p>
                Cada pieza en nuestro catálogo ha sido seleccionada y mantenida con 
                estándares de excelencia, asegurando que la historia continúe en cada 
                evento, en cada baile y en cada sonrisa.
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-border/40 mt-24 mb-24" />
        
        {/* Closing Quote */}
        <section className="text-center max-w-3xl mx-auto pb-24">
          <h3 className="text-3xl font-display italic mb-8 text-foreground/80">
            Continuamos escribiendo esta historia junto a ti.
          </h3>
          <div className="inline-flex items-center gap-4 text-primary font-bold tracking-widest text-sm uppercase">
            <span>Tradición</span>
            <div className="w-8 h-px bg-primary/30" />
            <span>Innovación</span>
            <div className="w-8 h-px bg-primary/30" />
            <span>Panamá</span>
          </div>
        </section>
      </div>
    </div>
  );
}
