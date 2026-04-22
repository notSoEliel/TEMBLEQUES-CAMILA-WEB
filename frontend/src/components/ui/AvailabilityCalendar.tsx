import React, { useEffect, useState, useMemo } from "react";
import { productsApi } from "@/services/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookedRange {
  start: string;
  end: string;
}

interface AvailabilityCalendarProps {
  productId: string;
  stock: number;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  /** Called with true when the selected range overlaps a booked period */
  onConflict?: (hasConflict: boolean) => void;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
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
 * Returns true if [rangeStart, rangeEnd] overlaps ANY booked range.
 * Overlap condition: rangeStart <= bookedEnd AND rangeEnd >= bookedStart
 */
function rangeOverlapsBooked(
  rangeStart: string,
  rangeEnd: string,
  bookedRanges: BookedRange[],
): boolean {
  for (const r of bookedRanges) {
    const bStart = isoDate(new Date(r.start));
    const bEnd   = isoDate(new Date(r.end));
    // Standard interval overlap: A.start <= B.end AND A.end >= B.start
    if (rangeStart <= bEnd && rangeEnd >= bStart) return true;
  }
  return false;
}

/**
 * Returns true if a given day falls within any booked range
 * (used to paint individual days red).
 */
function dayIsBooked(iso: string, bookedRanges: BookedRange[]): boolean {
  for (const r of bookedRanges) {
    const bStart = isoDate(new Date(r.start));
    const bEnd   = isoDate(new Date(r.end));
    if (iso >= bStart && iso <= bEnd) return true;
  }
  return false;
}

/**
 * Returns true if selecting `candidateEnd` as the end date would create a
 * range [startDate, candidateEnd] that overlaps a booked period.
 * Used to prevent hovering/clicking on dates that would create a conflicting range.
 */
function endWouldConflict(
  startDate: string,
  candidateEnd: string,
  bookedRanges: BookedRange[],
): boolean {
  if (candidateEnd <= startDate) return false;
  return rangeOverlapsBooked(startDate, candidateEnd, bookedRanges);
}

export default function AvailabilityCalendar({
  productId,
  stock,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onConflict,
}: AvailabilityCalendarProps) {
  const today = useMemo(() => isoDate(new Date()), []);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [waitingForEnd, setWaitingForEnd] = useState(false);

  // Fetch booked ranges for the current month view window
  useEffect(() => {
    if (!productId) return;
    setLoadingAvailability(true);
    const from = isoDate(startOfMonth(viewDate));
    const to = isoDate(endOfMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)));
    productsApi
      .availability(productId, from, to)
      .then((data) => setBookedRanges(data.booked))
      .catch(() => setBookedRanges([]))
      .finally(() => setLoadingAvailability(false));
  }, [productId, viewDate]);

  // Notify parent if the currently selected range has a conflict
  useEffect(() => {
    if (!startDate || !endDate || !onConflict) return;
    onConflict(rangeOverlapsBooked(startDate, endDate, bookedRanges));
  }, [startDate, endDate, bookedRanges]);

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
    if (iso < today || dayIsBooked(iso, bookedRanges)) return;

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

      // Check if the proposed range overlaps any booked period
      if (rangeOverlapsBooked(startDate, iso, bookedRanges)) {
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
    if (iso < today) return "past";
    if (dayIsBooked(iso, bookedRanges)) return "booked";
    if (iso === startDate) return "start";
    if (iso === endDate) return "end";
    if (startDate && endDate && iso > startDate && iso < endDate) return "inRange";
    // When waiting for end: shade dates that would create a conflicting range
    if (waitingForEnd && startDate && iso > startDate) {
      if (endWouldConflict(startDate, iso, bookedRanges)) return "conflictEnd";
    }
    return "available";
  }

  // Count overlapping rentals for stock availability
  const conflictingRentals = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return bookedRanges.filter((r) => {
      const bStart = isoDate(new Date(r.start));
      const bEnd   = isoDate(new Date(r.end));
      return startDate <= bEnd && endDate >= bStart;
    }).length;
  }, [bookedRanges, startDate, endDate]);

  const availableUnits = Math.max(0, stock - conflictingRentals);
  const hasRangeConflict =
    startDate && endDate
      ? rangeOverlapsBooked(startDate, endDate, bookedRanges)
      : false;

  return (
    <div className="space-y-4">
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
            "h-9 w-full flex items-center justify-center text-sm transition-colors select-none rounded-sm ";

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
          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/15 inline-block" /> Rango
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-destructive/10 border border-destructive/30 inline-block" /> No disponible
        </span>
      </div>

      {loadingAvailability && (
        <p className="text-xs text-muted-foreground animate-pulse">Cargando disponibilidad…</p>
      )}

      {/* Range conflict warning */}
      {hasRangeConflict && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 font-medium">
          ✗ El rango seleccionado se solapa con una reserva existente. Por favor elige otras fechas.
        </div>
      )}

      {/* Stock indicator */}
      {startDate && endDate && !hasRangeConflict && (
        <div
          className={`text-sm px-3 py-2 rounded-md border font-medium ${
            availableUnits > 0
              ? "bg-muted border-border text-foreground"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {availableUnits > 0
            ? `✓ ${availableUnits} unidad${availableUnits !== 1 ? "es" : ""} disponible${availableUnits !== 1 ? "s" : ""} para este período`
            : "✗ Sin unidades disponibles para las fechas seleccionadas"}
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
