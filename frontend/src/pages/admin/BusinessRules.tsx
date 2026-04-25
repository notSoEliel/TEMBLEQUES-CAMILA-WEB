import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Clock, Shield, DollarSign, BookOpen, 
  ArrowLeft, LayoutDashboard, Package, CalendarCheck, Users, Settings, Info
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function AdminBusinessRules() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section");

  // Fix for anchor scrolling and section deep-linking
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#ids-config") {
      setSearchParams({ section: "catalog" });
    }
    
    if (activeSection) {
      window.scrollTo(0, 0);
    }
  }, [activeSection, setSearchParams]);

  const setSection = (section: string | null) => {
    if (section) setSearchParams({ section });
    else setSearchParams({});
  };

  if (activeSection === "tabs") return <TabsGuide onBack={() => setSection(null)} />;
  if (activeSection === "states") return <StatesGuide onBack={() => setSection(null)} />;
  if (activeSection === "deposit") return <DepositGuide onBack={() => setSection(null)} />;
  if (activeSection === "late") return <LateGuide onBack={() => setSection(null)} />;
  if (activeSection === "catalog") return <CatalogGuide onBack={() => setSection(null)} />;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Información y Reglas</h1>
        <p className="text-muted-foreground max-w-2xl">
          Centro de documentación para administradores. Aquí encontrarás todo lo necesario para operar la plataforma sin errores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bento Item: Tabs Guide */}
        <Card className="flex flex-col border-2 border-black hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSection("tabs")}>
          <CardHeader>
            <div className="p-3 w-fit rounded-lg bg-blue-100 border-2 border-blue-200 mb-2">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>¿Para qué sirve cada pestaña?</CardTitle>
            <CardDescription>Guía rápida sobre las herramientas del panel.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground line-clamp-3">
              Resumen de Dashboard, Inventario, Reservas, Usuarios y Ajustes. Aprende a navegar como un experto.
            </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button variant="outline" className="w-full border-2 border-black">Ver Guía</Button>
          </div>
        </Card>

        {/* Bento Item: States */}
        <Card className="flex flex-col border-2 border-black hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSection("states")}>
          <CardHeader>
            <div className="p-3 w-fit rounded-lg bg-purple-100 border-2 border-purple-200 mb-2">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Flujo de Reservas</CardTitle>
            <CardDescription>Estados y ciclo de vida de un alquiler.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground line-clamp-3">
              Desde el pago pendiente hasta la devolución final. Qué significa cada estado y cuándo cambiarlo.
            </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button variant="outline" className="w-full border-2 border-black">Ver Flujo</Button>
          </div>
        </Card>

        {/* Bento Item: Deposit */}
        <Card className="flex flex-col border-2 border-black hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSection("deposit")}>
          <CardHeader>
            <div className="p-3 w-fit rounded-lg bg-green-100 border-2 border-green-200 mb-2">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Depósitos y Daños</CardTitle>
            <CardDescription>Seguridad financiera y protección de inventario.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground line-clamp-3">
              Cómo funcionan los holds de Stripe, el cálculo automático del 35% y la captura de fondos por daños.
            </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button variant="outline" className="w-full border-2 border-black">Ver Reglas</Button>
          </div>
        </Card>

        {/* Bento Item: Late */}
        <Card className="flex flex-col border-2 border-black hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSection("late")}>
          <CardHeader>
            <div className="p-3 w-fit rounded-lg bg-orange-100 border-2 border-orange-200 mb-2">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Mora y Atrasos</CardTitle>
            <CardDescription>Cálculo de penalidades por entregas tardías.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground line-clamp-3">
              Regla de cobro por día extra y cómo sincronizar manualmente los atrasos desde el dashboard.
            </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button variant="outline" className="w-full border-2 border-black">Ver Cálculo</Button>
          </div>
        </Card>

        {/* Bento Item: Catalog/IDs */}
        <Card className="flex flex-col border-2 border-black lg:col-span-2 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSection("catalog")}>
          <CardHeader>
            <div className="p-3 w-fit rounded-lg bg-amber-100 border-2 border-amber-200 mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Configuración de Catálogo e IDs</CardTitle>
            <CardDescription>Mantén la integridad de tus filtros y productos.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground">
              Guía técnica sobre los IDs internos de categorías. Aprende a crear nuevas categorías y a renombrarlas sin que tus productos desaparezcan de los filtros.
            </p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button variant="outline" className="w-full border-2 border-black">Ver Guía Técnica</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- Sub-Components (Detailed Pages) ---

function TabsGuide({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <h2 className="text-3xl font-bold">Guía de la Interfaz</h2>
      <div className="grid gap-4">
        <TabItem icon={LayoutDashboard} title="Dashboard" color="bg-blue-100 text-blue-600">
          Tu centro de mando. Muestra métricas de ingresos, productos más populares y, lo más importante, <strong>alertas de atrasos</strong> y productos dañados que requieren tu atención inmediata.
        </TabItem>
        <TabItem icon={Package} title="Inventario" color="bg-purple-100 text-purple-600">
          Aquí gestionas tus productos. Puedes añadir nuevas piezas, definir precios, tallas y, crucialmente, <strong>bloquear productos para mantenimiento</strong> si están dañados o en la lavandería.
        </TabItem>
        <TabItem icon={CalendarCheck} title="Reservas" color="bg-green-100 text-green-600">
          El corazón operativo. Aquí sigues el ciclo de vida de cada alquiler. Debes actualizar los estados (de Pagado a Confirmado, Entregado, etc.) a medida que interactúas con el cliente.
        </TabItem>
        <TabItem icon={Users} title="Usuarios" color="bg-zinc-100 text-zinc-600">
          Control de acceso. Permite ver quién tiene cuenta y gestionar los permisos de administrador para otros miembros de tu equipo.
        </TabItem>
        <TabItem icon={Settings} title="Ajustes" color="bg-amber-100 text-amber-600">
          Configuración global. Aquí defines qué categorías y qué grupos de tallas existen. El orden que pongas aquí define el orden en que el cliente verá los filtros en la tienda.
        </TabItem>
        <TabItem icon={Info} title="Info y Reglas" color="bg-red-100 text-red-600">
          Esta documentación. Úsala para resolver dudas sobre cálculos de mora o manejo de depósitos de seguridad.
        </TabItem>
      </div>
    </div>
  );
}

function TabItem({ icon: Icon, title, children, color }: any) {
  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className={`p-2 rounded-lg ${color} border-2 border-current/20`}>
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

function StatesGuide({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <h2 className="text-3xl font-bold">Ciclo de Vida de una Reserva</h2>
      <Card className="border-2 border-black">
        <CardContent className="p-6">
          <ol className="relative border-l-2 border-black ml-3 space-y-8">
            <StateStep status="Pendiente" description="La reserva fue iniciada pero el pago en Stripe no se completó. Estos pedidos suelen expirar automáticamente." />
            <StateStep status="Pagado" description="Stripe confirmó los fondos. El producto está oficialmente reservado para esas fechas." />
            <StateStep status="Confirmado" description="Acción del Admin: Has verificado el pedido y el producto está listo para ser recogido." />
            <StateStep status="Entregado" description="El cliente ya tiene el producto en su poder. El tiempo de alquiler está corriendo." />
            <StateStep status="Devuelto" description="Fin exitoso. El producto regresó en buen estado. Se libera el hold del depósito si existía." />
            <StateStep status="Atrasado" description="El cliente no entregó a tiempo. El sistema calcula mora diaria." />
            <StateStep status="Dañado" description="El producto regresó con daños. Se debe capturar el depósito de garantía." />
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function StateStep({ status, description }: any) {
  return (
    <li className="ml-6">
      <span className="absolute flex items-center justify-center w-4 h-4 bg-black rounded-full -left-[9px] ring-4 ring-white" />
      <h3 className="font-bold text-lg mb-1">{status}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </li>
  );
}

function DepositGuide({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <h2 className="text-3xl font-bold">Depósitos de Garantía (Hold/Capture)</h2>
      <Card className="border-2 border-black p-6 space-y-4">
        <div className="flex gap-4 items-start">
          <Shield className="h-8 w-8 text-green-600 shrink-0" />
          <div className="space-y-2">
            <h3 className="font-bold text-xl">¿Cómo protegemos el inventario?</h3>
            <p className="text-muted-foreground">
              En lugar de cobrar un depósito y luego devolverlo (lo cual genera comisiones bancarias), usamos el modelo de <strong>Pre-autorización</strong>.
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-lg border-2 border-border">
            <h4 className="font-bold mb-2">Regla de Cálculo</h4>
            <p className="text-sm">Si el total del alquiler es <strong>{">"} $350</strong>, se retiene el <strong>35%</strong> automáticamente.</p>
          </div>
          <div className="bg-muted p-4 rounded-lg border-2 border-border">
            <h4 className="font-bold mb-2">Liberación</h4>
            <p className="text-sm">Al marcar como <strong>Devuelto</strong>, el dinero "desaparece" de la retención del cliente en 24-48h sin cargos.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LateGuide({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <h2 className="text-3xl font-bold">Manejo de Atrasos</h2>
      <Card className="border-2 border-black p-6 space-y-6">
        <div className="flex gap-4 items-start">
          <Clock className="h-8 w-8 text-orange-600 shrink-0" />
          <div className="space-y-2">
            <h3 className="font-bold text-xl">Cálculo de la Mora</h3>
            <p className="text-muted-foreground">
              La penalidad es igual al <strong>valor diario</strong> del alquiler por cada día de retraso.
            </p>
          </div>
        </div>
        <div className="bg-orange-50 p-4 border-2 border-orange-200 rounded-lg">
          <h4 className="font-bold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Importante
          </h4>
          <p className="text-sm text-orange-700">
            Debes marcar manualmente el producto como <strong>Atrasado</strong> desde la pestaña de Reservas o el aviso en el Dashboard para que el sistema realice el cobro a la tarjeta guardada del cliente.
          </p>
        </div>
      </Card>
    </div>
  );
}

function CatalogGuide({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
      <h2 className="text-3xl font-bold">Guía de IDs e Integridad del Catálogo</h2>
      
      <div className="space-y-4">
        <Card className="border-2 border-black overflow-hidden">
          <div className="bg-amber-100 p-4 border-b-2 border-black">
            <h3 className="font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Regla de Oro de los IDs
            </h3>
          </div>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm">
              Cada categoría tiene un <strong>ID Interno</strong> (ej: <code>joyas_oro</code>). Este ID es lo que "pega" el producto a la categoría en la base de datos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-green-200 bg-green-50 p-3 rounded-lg">
                <h4 className="font-bold text-green-800 text-sm mb-1">Nombre Público:</h4>
                <p className="text-xs text-green-700">Cambiar "Joyas" a "Alhajas" es 100% seguro y estético.</p>
              </div>
              <div className="border-2 border-blue-200 bg-blue-50 p-3 rounded-lg">
                <h4 className="font-bold text-blue-800 text-sm mb-1">ID Interno (Slug):</h4>
                <p className="text-xs text-blue-700">Ahora es <strong>seguro</strong>. Si lo cambias, el sistema actualizará automáticamente todos tus productos vinculados.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle>Orden de Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Usa las flechas en la sección de Ajustes para organizar las categorías. El cliente verá primero lo que tú pongas primero. Recomendamos poner las categorías más populares arriba.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle>Guía para Nuevas Categorías</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold text-sm">1. Cómo elegir un buen ID</h4>
              <p className="text-xs text-muted-foreground">
                El ID debe ser corto, en minúsculas y sin espacios. Usa guiones bajos si es necesario.
                <br/><br/>
                ✅ <strong>Correcto:</strong> <code>pollera_lujo</code>, <code>joyas</code>, <code>infantil_ninas</code>
                <br/>
                ❌ <strong>Incorrecto:</strong> <code>Polleras de Lujo</code>, <code>123-Joyas!</code>, <code>id1</code> (poco descriptivo)
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-bold text-sm">2. Proceso de Creación</h4>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                <li>Haz clic en "Añadir" en Ajustes.</li>
                <li>Escribe el nombre público (ej. Sombreros). El sistema sugerirá un ID.</li>
                <li><strong>Verifica el ID</strong> antes de guardar. Una vez que empieces a añadir productos, cambiarlo será más difícil.</li>
                <li>Guarda los cambios y ve al Inventario para asignar tus productos a la nueva categoría.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
