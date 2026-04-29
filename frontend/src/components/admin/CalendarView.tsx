import React, { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { adminApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Calendar as CalendarIcon, User, Package, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-overrides.css"; // We'll create this for custom styling

const locales = {
  "es-PA": es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es, weekStartsOn: 0 }),
  getDay,
  locales,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  reserved: "Reservado",
  paid: "Pagado",
  confirmed: "Confirmado",
  delivered: "Entregado",
  returned: "Devuelto",
  late: "Atrasado",
  damaged: "Dañado",
  cancelled: "Cancelado",
};

// Color map with "Silent Luxury" aesthetic: Premium, varied and high-contrast
const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "oklch(96% 0.01 0)", text: "oklch(40% 0 0)", border: "oklch(90% 0 0)" },
  reserved: { bg: "oklch(92% 0.04 320)", text: "oklch(45% 0.1 320)", border: "oklch(85% 0.08 320)" },
  paid: { bg: "oklch(85% 0.1 260)", text: "oklch(35% 0.15 260)", border: "oklch(75% 0.12 260)" },
  confirmed: { bg: "oklch(60% 0.15 160)", text: "oklch(98% 0 0)", border: "transparent" },
  delivered: { bg: "oklch(55% 0.12 210)", text: "oklch(98% 0 0)", border: "transparent" },
  returned: { bg: "oklch(94% 0.02 45)", text: "oklch(40% 0.05 45)", border: "oklch(88% 0.05 45)" },
  late: { bg: "oklch(65% 0.18 35)", text: "oklch(98% 0 0)", border: "transparent" },
  damaged: { bg: "oklch(35% 0.03 0)", text: "oklch(98% 0 0)", border: "transparent" },
  cancelled: { bg: "oklch(98% 0 0)", text: "oklch(70% 0 0)", border: "oklch(92% 0 0)" },
};

interface CalendarViewProps {
  token: string;
  filterStatus?: string;
}

export default function CalendarView({ token, filterStatus }: CalendarViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const fetchEventsRange = async (range: { start: Date; end: Date } | Date[]) => {
    setLoading(true);
    try {
      let start: Date, end: Date;
      if (Array.isArray(range)) {
        start = range[0];
        end = range[range.length - 1];
      } else {
        start = range.start;
        end = range.end;
      }

      const from = start.toISOString();
      const to = end.toISOString();
      const response = await adminApi.calendarRentals(token, from, to);
      
      const mappedEvents = response.data
        .filter((r: any) => !filterStatus || r.status === filterStatus)
        .map((r: any) => ({
          id: r._id,
          title: `${r.product_id?.name || "Producto"} - ${r.user_id?.name || "Cliente"}`,
          start: new Date(r.start_date),
          end: new Date(r.end_date),
          resource: r,
        }));
      
      setEvents(mappedEvents);
    } catch (err) {
      console.error("Error loading calendar events:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Initial fetch for the current month view
    const range = {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
    fetchEventsRange(range);
  }, [token, filterStatus]); // Only re-fetch if token or status filter changes

  const eventPropGetter = (event: any) => {
    const status = event.resource.status;
    const colors = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.pending;
    return {
      className: "calendar-event-pill",
      style: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      },
    };
  };

  const components = useMemo(() => ({
    event: ({ event }: any) => {
      const status = event.resource.status;
      const colors = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.pending;
      return (
        <div 
          className="flex flex-col h-full overflow-hidden px-2 py-1" 
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          <span className="text-[10px] font-black uppercase truncate leading-tight">
            {event.resource.product_id?.name || "Producto"}
          </span>
          <div className="truncate text-[9px] font-medium leading-none">
            {event.resource.user_id?.name || "Cliente"}
          </div>
        </div>
      );
    },
    toolbar: (props: any) => {
      const { label, onNavigate } = props;
      return (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate("PREV")} className="rounded-full h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("TODAY")} className="text-[10px] font-black uppercase px-4 h-8 rounded-full border-border/60">
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("NEXT")} className="rounded-full h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
  }), []);

  return (
    <div className="space-y-6">
      {/* Legend - Elegant & Minimalist */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 p-6 bg-card rounded-[var(--radius)] border border-border/60 shadow-elegant">
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const colors = STATUS_COLOR_MAP[status];
          return (
            <div key={status} className="flex items-center gap-3 group transition-all hover:translate-y-[-1px]">
              <div 
                className="w-4 h-4 rounded-full shadow-sm ring-1 ring-inset ring-black/5" 
                style={{ backgroundColor: colors.bg }}
              />
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-[800px] bg-card rounded-[var(--radius)] border border-border/60 p-8 shadow-elegant relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[2px] flex items-center justify-center transition-all animate-in fade-in">
            <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-[var(--radius)] shadow-elegant border border-border/60">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando Reservas...</p>
            </div>
          </div>
        )}
        <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onNavigate={(date) => setCurrentDate(date)}
        onRangeChange={(range) => { fetchEventsRange(range); }}
        onView={(v) => setView(v)}
        view={view}
        date={currentDate}
        culture="es-PA"
        messages={{
          next: "Siguiente",
          previous: "Anterior",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
        }}
        eventPropGetter={eventPropGetter}
        components={components}
        onSelectEvent={(event) => setSelectedEvent(event.resource)}
        popup
        />
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[var(--radius)] border-border/60 shadow-elegant-lg p-0 overflow-hidden">
          {selectedEvent && (
            <div className="flex flex-col">
              <div className="h-32 bg-primary/5 relative flex items-center justify-center border-b border-border/40 overflow-hidden">
                 {selectedEvent.product_id?.images?.[0] ? (
                   <img src={selectedEvent.product_id.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110" />
                 ) : (
                   <div className="absolute inset-0 bg-primary/10" />
                 )}
                 <div className="relative z-10 flex flex-col items-center">
                    <Badge 
                      variant="outline" 
                      className="mb-2 font-black uppercase text-[10px] px-3 py-1 border-2"
                      style={{
                        backgroundColor: STATUS_COLOR_MAP[selectedEvent.status]?.bg || STATUS_COLOR_MAP.pending.bg,
                        color: STATUS_COLOR_MAP[selectedEvent.status]?.text || STATUS_COLOR_MAP.pending.text,
                        borderColor: "currentColor",
                      }}
                    >
                      {STATUS_LABELS[selectedEvent.status]}
                    </Badge>
                    <h3 className="text-2xl font-bold text-center px-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {selectedEvent.product_id?.name}
                    </h3>
                 </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Cliente
                    </p>
                    <p className="font-bold text-sm truncate">{selectedEvent.user_id?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedEvent.user_id?.email}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                      <Package className="w-3 h-3" /> Talla
                    </p>
                    <Badge variant="secondary" className="font-black uppercase text-[10px] rounded-full px-3">
                      {selectedEvent.selected_size}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Periodo de Alquiler
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Entrega</p>
                      <p className="font-black">{format(new Date(selectedEvent.start_date), "dd MMM, yyyy", { locale: es })}</p>
                    </div>
                    <div className="h-8 w-px bg-border/60" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Devolución</p>
                      <p className="font-black">{format(new Date(selectedEvent.end_date), "dd MMM, yyyy", { locale: es })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Total Pagado</p>
                    <p className="text-xl font-black text-primary">{formatCurrency(selectedEvent.total)}</p>
                  </div>
                  <Button 
                    className="rounded-full px-6 font-black uppercase text-[10px] h-10 shadow-elegant"
                    onClick={() => {
                      // Navigate to details if implemented
                      setSelectedEvent(null);
                    }}
                  >
                    Ver detalles completos
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
