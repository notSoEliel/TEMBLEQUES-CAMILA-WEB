import React, { useEffect, useState, useMemo } from "react";
import { productsApi } from "@/services/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
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

export default function AvailabilityCalendar({
  productId,
  stock,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: AvailabilityCalendarProps) {
  const today = useMemo(() => new Date(isoDate(new Date())), []);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Fetch booked dates for the current + next month window
  useEffect(() => {
    if (!productId) return;
    setLoadingAvailability(true);
    const from = isoDate(startOfMonth(viewDate));
    const to = isoDate(endOfMonth(addDays(endOfMonth(viewDate), 1)));
    productsApi
      .availability(productId, from, to)
      .then((data) => setBookedRanges(data.booked))
      .catch(() => setBookedRanges([]))
      .finally(() => setLoadingAvailability(false));
  }, [productId, viewDate]);

  // Set of booked date strings for O(1) lookup
  const bookedSet = useMemo(() => {
    const set = new Set<string>();
    for (const range of bookedRanges) {
      const s = new Date(range.start);
      const e = new Date(range.end);
      const cur = new Date(s);
      while (cur <= e) {
        set.add(isoDate(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [bookedRanges]);

  const days = useMemo(
    () => eachDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  // Padding days at start (Mon = 0 offset)
  const firstDayOfWeek = useMemo(() => {
    const d = days[0].getDay();
    // JS: 0=Sun, 1=Mon … convert to Mon-first
    return d === 0 ? 6 : d - 1;
  }, [days]);

  const prevMonth = () =>
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  function handleDayClick(day: Date) {
    const iso = isoDate(day);
    if (day < today || bookedSet.has(iso)) return;

    if (!startDate || selectingEnd === false) {
      // First click: set start date, enter "selecting end" mode
      onStartDateChange(iso);
      onEndDateChange("");
      setSelectingEnd(true);
    } else {
      // Second click: set end date
      if (iso <= startDate) {
        // Clicked before or same as start → restart
        onStartDateChange(iso);
        onEndDateChange("");
      } else {
        onEndDateChange(iso);
        setSelectingEnd(false);
      }
    }
  }

  function getDayState(day: Date): "past" | "booked" | "start" | "end" | "inRange" | "available" {
    const iso = isoDate(day);
    if (day < today) return "past";
    if (bookedSet.has(iso)) return "booked";
    if (iso === startDate) return "start";
    if (iso === endDate) return "end";
    if (startDate && endDate && iso > startDate && iso < endDate) return "inRange";
    return "available";
  }

  // Count active rentals for the currently selected range to show remaining stock
  const conflictingRanges = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return bookedRanges.filter((r) => {
      const rStart = isoDate(new Date(r.start));
      const rEnd = isoDate(new Date(r.end));
      return rStart <= endDate && rEnd >= startDate;
    }).length;
  }, [bookedRanges, startDate, endDate]);

  const availableUnits = Math.max(0, stock - conflictingRanges);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 border-[3px] border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors active:translate-y-[1px]"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-sm tracking-widest uppercase">
          {MONTH_NAMES_ES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 border-[3px] border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors active:translate-y-[1px]"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase text-black/50 py-1">
            {d}
          </div>
        ))}

        {/* Padding cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const state = getDayState(day);
          const iso = isoDate(day);
          const isClickable = state !== "past" && state !== "booked";

          let cellClass =
            "relative h-9 w-full flex items-center justify-center text-sm font-medium transition-all select-none ";

          if (state === "past") {
            cellClass += "text-black/20 cursor-not-allowed";
          } else if (state === "booked") {
            cellClass +=
              "bg-red-100 text-red-400 cursor-not-allowed line-through";
          } else if (state === "start") {
            cellClass +=
              "bg-black text-white cursor-pointer border-[3px] border-black";
          } else if (state === "end") {
            cellClass +=
              "bg-black text-white cursor-pointer border-[3px] border-black";
          } else if (state === "inRange") {
            cellClass += "bg-black/10 text-black cursor-pointer";
          } else {
            cellClass +=
              "cursor-pointer border border-transparent hover:border-black hover:bg-black/5";
          }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => isClickable && handleDayClick(day)}
              className={cellClass}
              aria-label={`${iso}${state === "booked" ? " — reservado" : ""}`}
              aria-pressed={state === "start" || state === "end"}
              disabled={!isClickable}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-black inline-block" /> Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-black/10 inline-block" /> Rango
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-100 border border-red-300 inline-block" /> Reservado
        </span>
      </div>

      {/* Loading overlay hint */}
      {loadingAvailability && (
        <p className="text-xs text-black/40 animate-pulse">Cargando disponibilidad…</p>
      )}

      {/* Stock indicator */}
      {startDate && endDate && (
        <div
          className={`border-[3px] p-3 text-sm font-bold ${
            availableUnits > 0
              ? "border-black bg-white"
              : "border-red-500 bg-red-50 text-red-700"
          }`}
        >
          {availableUnits > 0 ? (
            <>
              ✓ {availableUnits} unidad{availableUnits !== 1 ? "es" : ""} disponible
              {availableUnits !== 1 ? "s" : ""} para estas fechas
            </>
          ) : (
            <>✗ Sin disponibilidad para las fechas seleccionadas</>
          )}
        </div>
      )}

      {/* Instruction hint */}
      {!startDate && (
        <p className="text-xs text-black/50">
          Haz clic en una fecha para establecer el <strong>inicio</strong> del alquiler.
        </p>
      )}
      {startDate && !endDate && (
        <p className="text-xs text-black/50">
          Ahora selecciona la fecha de <strong>devolución</strong>.
        </p>
      )}
    </div>
  );
}
