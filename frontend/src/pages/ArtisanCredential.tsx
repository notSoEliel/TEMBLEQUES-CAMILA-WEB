import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ShieldCheck, Award, MapPin } from "lucide-react";

export default function ArtisanCredential() {
  return (
    <div className="bg-background min-h-screen py-24 px-6">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="rounded-full px-6 py-1 border-primary/30 text-primary font-bold uppercase tracking-widest text-[10px]">
            Autenticidad Garantizada
          </Badge>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-tight py-2">
            Credencial de <span className="text-primary italic">Artesano Elite</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
            Cada pieza en Tembleques Camila es el resultado del trabajo de manos expertas 
            certificadas que mantienen vivo el arte de la orfebrería folclórica.
          </p>
        </div>

        {/* Digital Certificate Card */}
        <Card className="border-none shadow-elegant-lg overflow-hidden rounded-[2rem] bg-card/50 backdrop-blur-sm relative group animate-in fade-in zoom-in duration-1000">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/30" />
          
          <CardContent className="p-8 md:p-12 space-y-10">
            {/* Certificate Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold">Certificación de Excelencia</h3>
                  <p className="text-sm text-muted-foreground font-medium">Registro N° TC-2024-PAN-088</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-tighter border border-green-500/20">
                <CheckCircle2 className="h-4 w-4" />
                Estado: Activo y Verificado
              </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Certificate Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary/70">Nuestros Estándares</h4>
                <ul className="space-y-4">
                  {[
                    "Materiales de grado joyero (Escamas, Perlas, Cristales)",
                    "Técnicas de ensamblaje tradicional panameño",
                    "Certificación de origen y taller de manufactura",
                    "Protocolos de conservación y limpieza premium"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-medium text-foreground/80">
                      <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/30 rounded-[1.5rem] p-8 space-y-4 border border-border/20">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>Sello de Origen</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  "Este certificado garantiza que la vestimenta y accesorios han sido 
                  confeccionados bajo la supervisión de maestros artesanos registrados 
                  en la República de Panamá, respetando las leyes de propiedad intelectual 
                  y protección folclórica."
                </p>
                <div className="pt-4 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Firma Autorizada</p>
                    <div className="font-script text-2xl text-foreground/70">Jacqueline Quiroz</div>
                  </div>
                  <div className="h-16 w-16 flex items-center justify-center">
                    <img src="/qr.png" alt="QR de Verificación" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
          {[
            {
              title: "Calidad Museo",
              desc: "Piezas mantenidas bajo estándares de conservación textil."
            },
            {
              title: "Garantía de Autor",
              desc: "Trazabilidad completa desde el taller hasta tu evento."
            },
            {
              title: "Soporte Experto",
              desc: "Asesoría personalizada sobre el uso y protocolo folclórico."
            }
          ].map((benefit, i) => (
            <div key={i} className="space-y-3 text-center md:text-left">
              <h5 className="font-display font-bold text-xl">{benefit.title}</h5>
              <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
