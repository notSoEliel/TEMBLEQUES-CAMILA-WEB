import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Clock, Shield, DollarSign, BookOpen } from "lucide-react";

export default function AdminBusinessRules() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Información y Lógica de Negocio</h1>
        <p className="text-muted-foreground mt-1">
          Documentación interna sobre cómo operan las reglas automáticas y flujos de reserva en Tembleques Camila.
        </p>
      </div>

      {/* Flujo de Estados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Flujo de Estados de Reserva
          </CardTitle>
          <CardDescription>El ciclo de vida completo de un alquiler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground">
              <li><strong>Pendiente:</strong> La reserva fue creada pero el pago en Stripe no se completó o fue abandonado.</li>
              <li><strong>Pagado:</strong> Stripe confirmó el pago. El sistema retuvo un "hold" de depósito si era necesario.</li>
              <li><strong>Confirmado:</strong> El administrador ha verificado el pedido y está listo para entregarse.</li>
              <li><strong>Entregado:</strong> El cliente tiene el producto en su poder.</li>
              <li><strong>Devuelto:</strong> El cliente devolvió el producto a tiempo y sin daños. Se libera el hold del depósito automáticamente.</li>
              <li><strong>Atrasado (Late):</strong> El cliente no devolvió el producto a tiempo. Se calcula y cobra automáticamente la mora por los días extra.</li>
              <li><strong>Dañado:</strong> El producto sufrió daños. Se captura automáticamente el depósito retenido.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Depósito de Garantía */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Depósito de Garantía
          </CardTitle>
          <CardDescription>Cómo se calcula y procesa el cobro por daños.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Para asegurar el inventario frente a daños irreparables, el sistema implementa un modelo de "hold" o pre-autorización en la tarjeta del cliente, sin cobrar el dinero hasta que sea necesario.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <h4 className="font-bold text-sm mb-2">Regla Global (Por Defecto)</h4>
              <p className="text-sm text-muted-foreground">
                Si el valor total del alquiler supera los <strong>$350</strong>, se retiene automáticamente el <strong>35%</strong> del monto total.
              </p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <h4 className="font-bold text-sm mb-2">Por Producto (Override)</h4>
              <p className="text-sm text-muted-foreground">
                En <em>Inventario</em>, puedes forzar que un producto requiera depósito independientemente del costo, o definir un monto fijo exacto (ej. retener siempre $50 para joyas).
              </p>
            </div>
          </div>
          <Separator />
          <h4 className="font-bold text-sm">Ejecución del Depósito</h4>
          <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
            <li>Si marcas el pedido como <Badge variant="secondary">Devuelto</Badge>, el hold se libera y desaparece del estado de cuenta del cliente (no hay cobro).</li>
            <li>Si marcas el pedido como <Badge variant="destructive">Dañado</Badge>, se ejecuta una <strong>captura</strong> y los fondos se transfieren inmediatamente a tu cuenta de Stripe.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Penalidades por Atraso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Penalidades por Atraso (Mora)
          </CardTitle>
          <CardDescription>Cómo funciona el cobro por entregas tardías.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Cuando un cliente no devuelve el producto en la fecha pactada, el sistema permite aplicar un cargo extra basado en los días de retraso usando el método de pago guardado.
          </p>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-bold text-sm text-orange-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Importante: Sincronización Manual
            </h4>
            <p className="text-sm text-orange-800/80">
              Actualmente, <strong>el sistema no cobra los atrasos de forma automática a medianoche</strong>. Debes revisar el panel de "Posibles Atrasos" en el Dashboard y marcar explícitamente el pedido como <Badge variant="destructive">Atrasado</Badge>.
            </p>
          </div>
          <Separator />
          <h4 className="font-bold text-sm">Cálculo Incremental</h4>
          <p className="text-sm text-muted-foreground">
            La mora se calcula dinámicamente cuando haces clic en "Marcar Atrasado". El sistema evalúa:
            <br/><br/>
            <code>Días de Atraso = (Fecha Actual en Panamá) - (Fecha de Devolución Prometida)</code>
            <br/><br/>
            Por cada día de atraso, se cobra el valor equivalente a <strong>1 día de alquiler</strong> de ese producto (Tarifa Diaria x 1). Si marcas un producto como atrasado 2 días después de su fecha de devolución, se cobrarán 2 días de mora juntos.
          </p>
        </CardContent>
      </Card>

      {/* Futuras Mejoras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Plan de Futuras Mejoras
          </CardTitle>
          <CardDescription>Funcionalidades previstas para próximas versiones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
            <li><strong>Automatización Incremental (Cron):</strong> Un servicio diario (job) que cobre de forma automática $X cada noche a los clientes que no han entregado, sin intervención manual.</li>
            <li><strong>Sistema de Devolución QR:</strong> Para negocios B2C, la mejor forma de asegurar y facilitar devoluciones es incluir una etiqueta con código QR en la prenda. Al devolverla, un simple escaneo la marcaría como `Devuelta` instantáneamente en el sistema.</li>
            <li><strong>Manejo de Fallos SCA (Pagos Fallidos):</strong> Si el banco del cliente bloquea el cobro por daños/mora debido a requisitos de "Autenticación Fuerte de Cliente" (SCA), se creará un flujo de email automático enviando un link al cliente para que autorice el pago atrasado.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Gestión de Catálogo e IDs */}
      <Card id="ids-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Guía de IDs Internos y Categorías
          </CardTitle>
          <CardDescription>Cómo gestionar los identificadores sin romper la relación con los productos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-bold text-sm text-amber-800 mb-2">¿Qué es el ID Interno?</h4>
            <p className="text-sm text-amber-800/80">
              Es el código único que vincula un producto con su categoría. Por ejemplo, si una categoría tiene el ID <code>pollera</code>, todos los productos creados bajo esa categoría guardan ese texto internamente.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground">Escenarios Comunes:</h4>
            
            <div className="space-y-2">
              <h5 className="text-sm font-bold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">1</span>
                Cambiar solo el Nombre Público
              </h5>
              <p className="text-sm text-muted-foreground pl-7">
                Puedes cambiar "Polleras" por "Vestimenta Nacional" sin problemas siempre que el <strong>ID Interno</strong> se mantenga igual. Esto no afecta a ningún producto.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-bold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white">2</span>
                Cambiar el ID Interno por Accidente
              </h5>
              <p className="text-sm text-muted-foreground pl-7">
                Si cambias el ID de <code>pollera</code> a <code>vestido</code>, los productos viejos seguirán buscando <code>pollera</code> y <strong>desaparecerán de los filtros del catálogo</strong>.
              </p>
              <div className="bg-muted p-3 rounded border ml-7 text-xs">
                <strong>Solución:</strong> Debes ir a la pestaña de <em>Inventario</em> y editar cada producto afectado para asignarle la "nueva" categoría.
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-bold flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">3</span>
                Añadir una Categoría Nueva
              </h5>
              <p className="text-sm text-muted-foreground pl-7">
                Al añadir una nueva, el sistema genera un ID automático basado en el nombre. Una vez guardada, ya aparecerá disponible al crear o editar productos en el Inventario.
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-800">Tip Profesional</Badge>
              Orden de los Filtros
            </h4>
            <p className="text-sm text-blue-800/80">
              El orden en el que coloques las categorías y grupos de tallas en el panel de configuración es <strong>exactamente el mismo orden</strong> en el que aparecerán para tus clientes en el catálogo móvil y de escritorio.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
