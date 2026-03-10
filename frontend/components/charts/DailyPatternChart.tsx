"use client";

import { useState, useMemo } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface HourlyEntry {
    hour: number;
    avg_kwh: number;
    hvac?: number;
    kitchen?: number;
    entertainment?: number;
    other?: number;
}

interface Props {
    data: HourlyEntry[];
}

const CATEGORIES = ["hvac", "kitchen", "entertainment", "other"] as const;
const CAT_COLORS: Record<string, string> = {
    hvac: "#38bdf8",
    kitchen: "#fb923c",
    entertainment: "#a78bfa",
    other: "#4ade80",
};

const HOUR_LABEL = (h: number) => {
    if (h === 0) return "12AM";
    if (h === 12) return "12PM";
    return h < 12 ? `${h}AM` : `${h - 12}PM`;
};

function findPeakLabel(data: HourlyEntry[], avg: number): string {
    const peaks = data.filter((d) => d.avg_kwh > avg * 1.5).map((d) => d.hour);
    if (!peaks.length) return "";
    return `Peak: ${HOUR_LABEL(peaks[0])} – ${HOUR_LABEL(peaks[peaks.length - 1])}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 text-xs shadow-2xl">
            <p className="font-semibold text-slate-200 mb-2">{HOUR_LABEL(label)}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: {Number(p.value).toFixed(3)} kWh
                </p>
            ))}
        </div>
    );
};

export default function DailyPatternChart({ data }: Props) {
    const [stacked, setStacked] = useState(false);

    const avg = useMemo(
        () => data.reduce((s, d) => s + d.avg_kwh, 0) / data.length || 0,
        [data]
    );
    const peakLabel = useMemo(() => findPeakLabel(data, avg), [data, avg]);

    // Enrich data with mock category splits if not provided
    const enriched = useMemo<HourlyEntry[]>(() =>
        data.map((d) => {
            if (d.hvac !== undefined) return d;
            const base = d.avg_kwh;
            return {
                ...d,
                hvac: +(base * 0.40).toFixed(3),
                kitchen: +(base * 0.25).toFixed(3),
                entertainment: +(base * 0.20).toFixed(3),
                other: +(base * 0.15).toFixed(3),
            };
        }),
        [data]
    );

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-white">Daily Usage Pattern</h3>
                    <p className="text-xs text-slate-400">
                        Average kWh · {peakLabel && <span className="text-orange-400">{peakLabel}</span>}
                    </p>
                </div>
                <button
                    onClick={() => setStacked((s) => !s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${stacked
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                        }`}
                >
                    {stacked ? "By Category" : "Total Only"}
                </button>
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={enriched} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                        {!stacked && (
                            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                            </linearGradient>
                        )}
                        {stacked && CATEGORIES.map((cat) => (
                            <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CAT_COLORS[cat]} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={CAT_COLORS[cat]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        tickFormatter={HOUR_LABEL}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval={2}
                    />
                    <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Peak reference area */}
                    {avg > 0 && (
                        <ReferenceLine
                            y={avg * 1.5}
                            stroke="#f97316"
                            strokeDasharray="4 3"
                            label={{ value: "1.5× avg", fill: "#f97316", fontSize: 9, position: "right" }}
                        />
                    )}

                    {!stacked ? (
                        <Area
                            type="monotone"
                            dataKey="avg_kwh"
                            name="Total"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            fill="url(#gradTotal)"
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: "#38bdf8",
                            }}
                        />
                    ) : (
                        CATEGORIES.map((cat) => (
                            <Area
                                key={cat}
                                type="monotone"
                                dataKey={cat}
                                name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                                stackId="1"
                                stroke={CAT_COLORS[cat]}
                                strokeWidth={1.5}
                                fill={`url(#grad-${cat})`}
                                dot={false}
                            />
                        ))
                    )}
                    {stacked && <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
