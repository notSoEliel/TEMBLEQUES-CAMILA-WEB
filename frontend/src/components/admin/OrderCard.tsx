import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, RefreshCw, Trash2, CheckCircle2, CreditCard, ChevronDown, ChevronUp, Info, List } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface OrderCardProps {
  orderGroupId: string;
  rentals: any[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  onBulkStatusChange: (ids: string[], status: string) => Promise<void>;
  statusLabels: Record<string, string>;
  statusColors: Record<string, any>;
  actionLabels: Record<string, string>;
  transitions: Record<string, string[]>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function OrderCard({
  orderGroupId,
  rentals,
  onStatusChange,
  onBulkStatusChange,
  statusLabels,
  statusColors,
  actionLabels,
  transitions,
}: OrderCardProps) {
  const first = rentals[0];
  const totalOrder = rentals.reduce((sum, r) => sum + (r.total || 0), 0);
  const balanceDue = rentals.reduce((sum, r) => sum + (r.balance_due || 0), 0);
  const statuses = [...new Set(rentals.map((r) => r.status))];
  const isMixed = statuses.length > 1;
  const currentStatus = isMixed ? "mixed" : statuses[0];

  const [showDetails, setShowDetails] = React.useState(false);
  const rentalIds = rentals.map((r) => r._id);

  // Grouped actions logic
  const getBulkActions = () => {
    if (isMixed) return [];
    return transitions[currentStatus] || [];
  };

  const bulkActions = getBulkActions();

  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="bg-muted/30 border-b-2 border-black p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 rounded">
              Pedido #{orderGroupId.slice(-6).toUpperCase()}
            </span>
            <Badge variant="outline" className="text-[10px] font-black border-2 border-black bg-muted/50">
              {rentals.length} {rentals.length === 1 ? "Artículo" : "Artículos"}
            </Badge>
          </div>
          <h3 className="font-black text-lg uppercase leading-tight">{first.user_id?.name || "Usuario Desconocido"}</h3>
          <p className="text-xs text-muted-foreground font-medium">{first.user_id?.email}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total del Pedido</p>
          <p className="text-2xl font-black text-primary">{formatCurrency(totalOrder)}</p>
          {balanceDue > 0 && (
            <p className="text-[10px] font-black text-destructive bg-destructive/10 px-2 py-0.5 rounded mt-1 border border-destructive/20 uppercase">
              Deuda: {formatCurrency(balanceDue)}
            </p>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="mt-2 text-[10px] font-black uppercase hover:bg-black hover:text-white border-2 border-transparent hover:border-black transition-all"
          >
            {showDetails ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {showDetails ? "Ocultar Detalles" : "Ver Detalles Completos"}
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="bg-muted/10 border-b-2 border-black p-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
              <List className="w-3 h-3" />
              Desglose de Facturación
            </h4>
            <div className="bg-white border-2 border-black rounded-xl p-4 space-y-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between text-xs font-medium">
                <span>Subtotal (Neto)</span>
                <span>{formatCurrency(totalOrder / 1.07)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span>ITBMS (7%)</span>
                <span>{formatCurrency(totalOrder - (totalOrder / 1.07))}</span>
              </div>
              <Separator className="bg-black/10" />
              <div className="flex justify-between text-sm font-black">
                <span>TOTAL FINAL</span>
                <span className="text-primary">{formatCurrency(totalOrder)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-3 h-3" />
              Estado de Pago
            </h4>
            <div className="bg-white border-2 border-black rounded-xl p-4 space-y-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between text-xs font-medium">
                <span>Monto Pagado</span>
                <span className="text-green-600">{formatCurrency(totalOrder - balanceDue)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span>Saldo Pendiente</span>
                <span className={balanceDue > 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
              {balanceDue > 0 && (
                <div className="mt-2 p-2 bg-destructive/5 border-2 border-destructive/20 rounded-lg text-center">
                  <p className="text-[9px] font-black uppercase text-destructive italic">
                    Saldo restante a pagar en tienda: {formatCurrency(balanceDue)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <CardContent className="p-0 bg-white">
        <div className="divide-y-2 divide-black/5">
          {rentals.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between gap-4 group">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {r.product_id?.images?.[0] ? (
                    <img src={r.product_id.images[0]} alt="" className="w-10 h-14 object-cover rounded border-2 border-black" />
                  ) : (
                    <div className="w-10 h-14 bg-muted border-2 border-black rounded flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight uppercase group-hover:text-primary transition-colors">
                    {r.product_id?.name || "Producto"}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] font-black bg-muted border-2 border-black px-1.5 py-0 rounded uppercase">
                      Talla: {r.selected_size}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.start_date).toLocaleDateString("es-PA", { timeZone: "UTC", month: "short", day: "numeric" })} - {new Date(r.end_date).toLocaleDateString("es-PA", { timeZone: "UTC", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Item Total</p>
                  <p className="font-black text-sm">{formatCurrency(r.total)}</p>
                </div>
                <Badge variant={statusColors[r.status]} className="text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {statusLabels[r.status]}
                </Badge>
                
                {/* Individual Action Dropdown/Modal */}
                <ConfirmModal
                  title="Gestionar Artículo"
                  description="Cambia el estado de este artículo individualmente."
                  onConfirm={() => {}} 
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 border-2 border-transparent hover:border-black hover:bg-muted rounded-lg transition-all">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  }
                >
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {transitions[r.status]?.map((s) => {
                      const isDestructive = s === "cancelled" || s === "damaged";
                      return (
                        <Button
                          key={s}
                          variant={isDestructive ? "destructive" : "outline"}
                          size="sm"
                          className="text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all"
                          onClick={() => onStatusChange(r._id, s)}
                        >
                          {actionLabels[s] || s}
                        </Button>
                      );
                    })}
                  </div>
                </ConfirmModal>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Bulk Actions Footer */}
      <div className="bg-black/5 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t-2 border-black">
        <div className="flex items-center gap-2">
          {isMixed ? (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 border-2 border-amber-200 px-3 py-1 rounded-full">
              <RefreshCw className="w-3 h-3" />
              Estados Mixtos en el Pedido
            </div>
          ) : (
            <div className={`flex items-center gap-2 text-[10px] font-black uppercase px-3 py-1 rounded-full border-2 ${
              currentStatus === "pending" 
                ? "text-amber-600 bg-amber-50 border-amber-200" 
                : "text-green-600 bg-green-50 border-green-200"
            }`}>
              <CheckCircle2 className="w-3 h-3" />
              Estado uniforme: {statusLabels[currentStatus]}
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {bulkActions.length > 0 ? (
            bulkActions.map((s) => {
              const isDestructive = s === "cancelled" || s === "damaged";
              const isPositive = s === "paid" || s === "confirmed" || s === "delivered";
              
              return (
                <ConfirmModal
                  key={s}
                  title={`${actionLabels[s] || s} (Todo el pedido)`}
                  description={`¿Estás seguro de que deseas cambiar el estado de los ${rentals.length} artículos a ${statusLabels[s]}?`}
                  variant={isDestructive ? "destructive" : "default"}
                  onConfirm={() => onBulkStatusChange(rentalIds, s)}
                >
                  <Button
                    size="sm"
                    variant={isDestructive ? "destructive" : isPositive ? "default" : "outline"}
                    className={`flex-1 sm:flex-none text-[10px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all uppercase px-4 py-2 h-auto`}
                  >
                    {isPositive && <CheckCircle2 className="w-3 h-3 mr-2" />}
                    {isDestructive && <Trash2 className="w-3 h-3 mr-2" />}
                    {(actionLabels[s] || s).toUpperCase()} TODO
                  </Button>
                </ConfirmModal>
              );
            })
          ) : !isMixed && (
            <p className="text-[10px] font-black uppercase text-muted-foreground italic">
              Sin acciones masivas disponibles para este estado.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
