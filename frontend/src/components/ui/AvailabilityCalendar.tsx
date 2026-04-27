import React, { useEffect, useState, useMemo } from "react";
import { productsApi } from "@/services/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookedRange {
  start: string;
  end: string;
  size: string;
}

interface AvailabilityCalendarProps {
  productId: string;
  selectedSize?: string | null;
  stock: number;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  /** Called with true when the selected range overlaps a booked period */
  onConflict?: (hasConflict: boolean) => void;
}

function isoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function eachDayOfMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

// ─── Range overlap check ──────────────────────────────────────────────────────

/**
 * Returns how many overlapping bookings exist for a specific day.
 */
function getOverlappingBookingsCount(
  iso: string,
  bookedRanges: BookedRange[],
): number {
  let count = 0;
  for (const r of bookedRanges) {
    const bStart = isoDate(new Date(r.start));
    const bEnd   = isoDate(new Date(r.end));
    if (iso >= bStart && iso <= bEnd) count++;
  }
  return count;
}

/**
 * Returns true if a given day is fully booked (bookings >= stock)
 */
function dayIsFullyBooked(
  iso: string,
  bookedRanges: BookedRange[],
  stock: number
): boolean {
  return getOverlappingBookingsCount(iso, bookedRanges) >= stock;
}

/**
 * Returns true if [rangeStart, rangeEnd] overlaps ANY fully booked day.
 */
function rangeHasConflict(
  rangeStart: string,
  rangeEnd: string,
  bookedRanges: BookedRange[],
  stock: number
): boolean {
  if (rangeStart > rangeEnd) return false;
  let current = new Date(rangeStart + "T12:00:00");
  const end = new Date(rangeEnd + "T12:00:00");
  while (current <= end) {
    const iso = isoDate(current);
    if (dayIsFullyBooked(iso, bookedRanges, stock)) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}

/**
 * Returns true if selecting `candidateEnd` as the end date would create a
 * range [startDate, candidateEnd] that overlaps a booked period.
 */
function endWouldConflict(
  startDate: string,
  candidateEnd: string,
  bookedRanges: BookedRange[],
  stock: number
): boolean {
  if (candidateEnd <= startDate) return false;
  return rangeHasConflict(startDate, candidateEnd, bookedRanges, stock);
}

export default function AvailabilityCalendar({
  productId,
  selectedSize,
  stock,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onConflict,
}: AvailabilityCalendarProps) {
  const { minDate, isPast6pm } = useMemo(() => {
    const d = new Date();
    // Obtener la hora actual en Panamá
    const panamaHour = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Panama" })).getHours();
    const isPast6pm = panamaHour >= 18;
    
    d.setDate(d.getDate() + (isPast6pm ? 2 : 1));
    return { minDate: isoDate(d), isPast6pm };
  }, []);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [waitingForEnd, setWaitingForEnd] = useState(false);

  // Fetch booked ranges for the current month view window
  useEffect(() => {
    if (!productId || productId === "preview-id") {
      setBookedRanges([]);
      return;
    }
    setLoadingAvailability(true);
    const from = isoDate(startOfMonth(viewDate));
    const to = isoDate(endOfMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)));
    productsApi
      .availability(productId, from, to)
      .then((data) => {
        setBookedRanges(data.booked || []);
      })
      .catch(() => setBookedRanges([]))
      .finally(() => setLoadingAvailability(false));
  }, [productId, viewDate]);

  // Filter booked ranges by the selected size
  const relevantBookedRanges = useMemo(() => {
    if (!selectedSize) return [];
    return bookedRanges.filter((r) => r.size === selectedSize || r.size === "Único");
  }, [bookedRanges, selectedSize]);

  // Notify parent if the currently selected range has a conflict
  useEffect(() => {
    if (!startDate || !endDate || !onConflict) return;
    onConflict(rangeHasConflict(startDate, endDate, relevantBookedRanges, stock));
  }, [startDate, endDate, relevantBookedRanges, stock]);

  const days = useMemo(
    () => eachDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const firstDayOfWeek = useMemo(() => {
    const d = days[0].getDay();
    return d === 0 ? 6 : d - 1; // Mon-first
  }, [days]);

  const prevMonth = () =>
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  function handleDayClick(day: Date) {
    const iso = isoDate(day);
    if (iso < minDate || dayIsFullyBooked(iso, relevantBookedRanges, stock)) return;

    if (!waitingForEnd) {
      // First click → set start, enter "waiting for end" mode
      onStartDateChange(iso);
      onEndDateChange("");
      setWaitingForEnd(true);
    } else {
      // Second click → validate and set end
      if (iso <= startDate) {
        // Clicked same or earlier → restart from here
        onStartDateChange(iso);
        onEndDateChange("");
        return;
      }

      // Check if the proposed range overlaps any fully booked period
      if (rangeHasConflict(startDate, iso, relevantBookedRanges, stock)) {
        // Instead of ignoring the click, we assume they want to start a new range
        onStartDateChange(iso);
        onEndDateChange("");
        setWaitingForEnd(true);
        return;
      }

      onEndDateChange(iso);
      setWaitingForEnd(false);
    }
  }

  type DayState = "past" | "booked" | "start" | "end" | "inRange" | "conflictEnd" | "available";

  function getDayState(iso: string): DayState {
    if (iso < minDate) return "past";
    if (dayIsFullyBooked(iso, relevantBookedRanges, stock)) return "booked";
    if (iso === startDate) return "start";
    if (iso === endDate) return "end";
    if (startDate && endDate && iso > startDate && iso < endDate) return "inRange";
    // When waiting for end: shade dates that would create a conflicting range
    if (waitingForEnd && startDate && iso > startDate) {
      if (endWouldConflict(startDate, iso, relevantBookedRanges, stock)) return "conflictEnd";
    }
    return "available";
  }

  // Count MAX overlapping rentals during the selected range for stock availability
  const conflictingRentals = useMemo(() => {
    if (!startDate || !endDate) return 0;
    let maxConflicts = 0;
    let current = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    while (current <= end) {
      const iso = isoDate(current);
      const c = getOverlappingBookingsCount(iso, relevantBookedRanges);
      if (c > maxConflicts) maxConflicts = c;
      current.setDate(current.getDate() + 1);
    }
    return maxConflicts;
  }, [relevantBookedRanges, startDate, endDate]);

  const availableUnits = Math.max(0, stock - conflictingRentals);
  const hasRangeConflict =
    startDate && endDate
      ? rangeHasConflict(startDate, endDate, relevantBookedRanges, stock)
      : false;

  return (
    <div className="space-y-4 relative">
      {/* 6 PM Warning Banner */}
      <div className={`border-2 p-3 text-sm flex gap-3 items-start font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isPast6pm ? "bg-amber-100 border-amber-900 text-amber-900" : "bg-muted border-black text-foreground"}`}>
        <span className="text-xs font-black uppercase py-1 px-2 border border-current">Nota</span>
        <p className="leading-snug">
          Las reservas para el día siguiente solo están disponibles hasta las <strong>6:00 PM</strong>.
          {isPast6pm && <span className="block mt-1 text-destructive font-bold">Como ya pasaron las 6:00 PM, la fecha más próxima para alquilar es pasado mañana.</span>}
        </p>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={prevMonth} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">
          {MONTH_NAMES_ES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={nextMonth} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1 uppercase">
            {d}
          </div>
        ))}

        {/* Padding */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Days */}
        {days.map((day) => {
          const iso   = isoDate(day);
          const state = getDayState(iso);
          // Allow clicking 'conflictEnd' so we can restart the selection!
          const isDisabled = state === "past" || state === "booked";

          let cellClass =
            "h-9 w-full flex items-center justify-center text-sm transition-colors select-none rounded-none ";

          switch (state) {
            case "past":
              cellClass += "text-muted-foreground/40 cursor-not-allowed";
              break;
            case "booked":
              cellClass += "bg-destructive/10 text-destructive line-through cursor-not-allowed font-medium";
              break;
            case "conflictEnd":
              // Would cause an overlap — show in muted red to communicate it's forbidden
              cellClass += "bg-destructive/10 text-destructive/60 cursor-not-allowed";
              break;
            case "start":
              cellClass += "bg-primary text-primary-foreground font-bold cursor-pointer";
              break;
            case "end":
              cellClass += "bg-primary text-primary-foreground font-bold cursor-pointer";
              break;
            case "inRange":
              cellClass += "bg-primary/15 text-primary font-medium cursor-pointer";
              break;
            default:
              cellClass += "cursor-pointer hover:bg-muted font-medium";
          }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => !isDisabled && handleDayClick(day)}
              className={cellClass}
              aria-label={`${iso}${state === "booked" ? " — reservado" : state === "conflictEnd" ? " — genera conflicto" : ""}`}
              aria-pressed={state === "start" || state === "end"}
              disabled={isDisabled}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-none bg-primary inline-block" /> Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-none bg-primary/15 inline-block" /> Rango
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-none bg-destructive/10 border border-destructive/30 inline-block" /> No disponible
        </span>
      </div>

      {loadingAvailability && (
        <p className="text-xs text-muted-foreground animate-pulse">Cargando disponibilidad…</p>
      )}

      {/* Range conflict warning */}
      {hasRangeConflict && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-none px-3 py-2 font-medium flex items-center gap-2">
          <span>Error:</span> El rango seleccionado se solapa con una reserva existente. Por favor elige otras fechas.
        </div>
      )}

      {/* Stock indicator */}
      {startDate && endDate && !hasRangeConflict && (
        <div
          className={`text-sm px-3 py-2 border font-medium flex items-center gap-2 ${
            availableUnits > 0
              ? "bg-muted border-black text-foreground"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {availableUnits > 0
            ? `Confirmado: ${availableUnits} unidad${availableUnits !== 1 ? "es" : ""} disponible${availableUnits !== 1 ? "s" : ""} para este período`
            : "Error: Sin unidades disponibles para las fechas seleccionadas"}
        </div>
      )}

      {/* Instruction hint */}
      {!startDate && (
        <p className="text-xs text-muted-foreground">
          Selecciona la fecha de <strong>inicio</strong> del alquiler.
        </p>
      )}
      {waitingForEnd && startDate && !endDate && (
        <p className="text-xs text-muted-foreground">
          Ahora selecciona la fecha de <strong>devolución</strong>.{" "}
          <span className="text-destructive">Las fechas en rojo generarían un conflicto.</span>
        </p>
      )}
    </div>
  );
}
