"use client";

import { useState, useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  isToday,
  subMonths,
  addMonths,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface HeatmapEntry {
  date: string;
  total_kwh: number;
  top_appliance: string;
}

interface Props {
  data: HeatmapEntry[];
  tariffPerKwh?: number; // ₹ per kWh for INR estimate
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function kwhToColor(kwh: number, min: number, max: number): string {
  const t = max > min ? (kwh - min) / (max - min) : 0;
  // white → light blue → deep blue → deep purple
  if (t < 0.25)
    return `hsl(210, ${Math.round(t * 4 * 60)}%, ${Math.round(95 - t * 4 * 20)}%)`;
  if (t < 0.6)
    return `hsl(${Math.round(210 - (t - 0.25) / 0.35 * 20)}, 70%, ${Math.round(75 - (t - 0.25) / 0.35 * 30)}%)`;
  return `hsl(${Math.round(190 - (t - 0.6) / 0.4 * 120)}, 65%, ${Math.round(45 - (t - 0.6) / 0.4 * 20)}%)`;
}

export default function HeatmapGrid({ data, tariffPerKwh = 8 }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tooltip, setTooltip] = useState<{
    entry: HeatmapEntry; x: number; y: number;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<HeatmapEntry | null>(null);

  const dataByDate = useMemo(
    () => Object.fromEntries(data.map((d) => [d.date, d])),
    [data]
  );

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const allKwh = data.map((d) => d.total_kwh);
  const minKwh = Math.min(...allKwh, 0);
  const maxKwh = Math.max(...allKwh, 1);

  // Pad start to align with Mon=0
  const firstDow = (getDay(monthDays[0]) + 6) % 7; // Mon-indexed
  const cells: (HeatmapEntry | null)[] = [
    ...Array(firstDow).fill(null),
    ...monthDays.map((d) => dataByDate[format(d, "yyyy-MM-dd")] ?? {
      date: format(d, "yyyy-MM-dd"),
      total_kwh: 0,
      top_appliance: "—",
    }),
  ];

  const weeks: (HeatmapEntry | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7)
    weeks.push(cells.slice(i, i + 7).concat(Array(7).fill(null)).slice(0, 7));

  const handleMouseEnter = useCallback(
    (entry: HeatmapEntry, e: React.MouseEvent) => {
      setTooltip({ entry, x: e.clientX, y: e.clientY });
    }, []
  );

  return (
    <div className="relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h3 className="text-sm font-semibold text-white">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1.5 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((entry, di) => {
              if (!entry) return <div key={di} />;
              const d = parseISO(entry.date);
              const color =
                entry.total_kwh > 0
                  ? kwhToColor(entry.total_kwh, minKwh, maxKwh)
                  : "#1e293b";
              const isSelected = selectedDay?.date === entry.date;
              return (
                <div
                  key={di}
                  className={`
                    aspect-square rounded-md cursor-pointer transition-all duration-150
                    ${isSelected ? "ring-2 ring-cyan-400" : "hover:ring-1 hover:ring-white/30"}
                    ${isToday(d) ? "ring-2 ring-yellow-400" : ""}
                  `}
                  style={{ backgroundColor: color }}
                  onMouseEnter={(e) => handleMouseEnter(entry, e)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => setSelectedDay(isSelected ? null : entry)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-slate-500">Low</span>
        <div className="flex-1 h-2 rounded-full" style={{
          background: "linear-gradient(to right, #1e293b, #60a5fa, #3b82f6, #6d28d9)"
        }} />
        <span className="text-[10px] text-slate-500">High</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-2xl text-xs min-w-[180px]"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-slate-200 mb-1">
            {format(parseISO(tooltip.entry.date), "EEE, d MMM yyyy")}
          </p>
          <p className="text-cyan-400">{tooltip.entry.total_kwh} kWh</p>
          <p className="text-emerald-400">
            ≈ ₹{(tooltip.entry.total_kwh * tariffPerKwh).toFixed(0)}
          </p>
          <p className="text-slate-400 mt-1">Top: {tooltip.entry.top_appliance}</p>
        </div>
      )}

      {/* Day detail drawer */}
      {selectedDay && (
        <div className="mt-4 rounded-xl bg-card border border-border p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-white">
              {format(parseISO(selectedDay.date), "EEEE, d MMMM yyyy")}
            </h4>
            <button onClick={() => setSelectedDay(null)}>
              <X className="w-4 h-4 text-slate-400 hover:text-white" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Energy</p>
              <p className="text-lg font-bold text-cyan-400">{selectedDay.total_kwh}</p>
              <p className="text-xs text-slate-500">kWh</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Est. Cost</p>
              <p className="text-lg font-bold text-emerald-400">
                ₹{(selectedDay.total_kwh * tariffPerKwh).toFixed(0)}
              </p>
              <p className="text-xs text-slate-500">INR</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-slate-400">Top Load</p>
              <p className="text-sm font-bold text-white leading-tight mt-1">
                {selectedDay.top_appliance}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
