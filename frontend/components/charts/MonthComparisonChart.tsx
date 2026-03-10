"use client";

import { useMemo } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { format, parse, getDaysInMonth } from "date-fns";

interface DaySeries {
    day: number;
    cumulative_kwh: number;
}

interface MonthSeries {
    month: string; // YYYY-MM
    day_series: DaySeries[];
}

interface Props {
    data: MonthSeries[];       // last 3 months
    tariffPerKwh?: number;
}

const CURRENT_PALETTE = "#38bdf8";
const MUTED_PALETTES = ["#475569", "#64748b"];
const PROJECTED_COLOR = "#7dd3fc";

const MONTH_LABEL = (month: string) =>
    format(parse(month, "yyyy-MM", new Date()), "MMM yyyy");

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 text-xs shadow-2xl">
            <p className="font-semibold text-slate-200 mb-2">Day {label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span className="text-slate-300">{Number(p.value).toFixed(1)} kWh</span>
                </div>
            ))}
        </div>
    );
};

export default function MonthComparisonChart({ data, tariffPerKwh = 8 }: Props) {
    const sorted = useMemo(
        () => [...data].sort((a, b) => a.month.localeCompare(b.month)),
        [data]
    );

    const currentMonth = sorted[sorted.length - 1];
    const pastMonths = sorted.slice(0, -1);

    // Build a lookup: day → { [month]: cumulative_kwh }
    const maxDay = 31;
    const rowMap = useMemo(() => {
        const map: Record<number, Record<string, number>> = {};
        for (let d = 1; d <= maxDay; d++) map[d] = {};
        for (const ms of sorted) {
            for (const dp of ms.day_series) {
                map[dp.day][ms.month] = dp.cumulative_kwh;
            }
        }
        return map;
    }, [sorted]);

    const chartData = useMemo(
        () =>
            Array.from({ length: maxDay }, (_, i) => ({
                day: i + 1,
                ...rowMap[i + 1],
            })),
        [rowMap]
    );

    // Project the current month using the last rate
    const lastEntry = currentMonth?.day_series[currentMonth.day_series.length - 1];
    const lastDay = lastEntry?.day ?? 0;
    const lastKwh = lastEntry?.cumulative_kwh ?? 0;
    const daysInCurrentMonth = currentMonth
        ? getDaysInMonth(parse(currentMonth.month, "yyyy-MM", new Date()))
        : 30;
    const dailyRate = lastDay > 0 ? lastKwh / lastDay : 0;
    const projectedEnd = Math.round(dailyRate * daysInCurrentMonth);

    // Add projection key to data
    const projectionKey = currentMonth ? `${currentMonth.month}_projected` : null;
    const enrichedData = useMemo(() => {
        if (!projectionKey || !currentMonth) return chartData;
        return chartData.map((row) => {
            if (row.day > lastDay && row.day <= daysInCurrentMonth) {
                return { ...row, [projectionKey]: parseFloat((dailyRate * row.day).toFixed(2)) };
            }
            return row;
        });
    }, [chartData, projectionKey, lastDay, daysInCurrentMonth, dailyRate, currentMonth]);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-white">Monthly Cumulative Comparison</h3>
                    <p className="text-xs text-slate-400">
                        Projected end-of-month:{" "}
                        <span className="text-cyan-400 font-semibold">{projectedEnd} kWh</span>
                        {" · "}
                        <span className="text-emerald-400">≈ ₹{(projectedEnd * tariffPerKwh).toLocaleString("en-IN")}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    {sorted.map((ms, i) => {
                        const isCurrent = i === sorted.length - 1;
                        return (
                            <span
                                key={ms.month}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                    background: isCurrent ? "rgba(56,189,248,0.15)" : "rgba(71,85,105,0.3)",
                                    color: isCurrent ? CURRENT_PALETTE : MUTED_PALETTES[i] || "#64748b",
                                    border: `1px solid ${isCurrent ? "rgba(56,189,248,0.3)" : "rgba(71,85,105,0.4)"}`,
                                }}
                            >
                                {MONTH_LABEL(ms.month)}
                            </span>
                        );
                    })}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={enrichedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="day"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: "Day of Month", position: "insideBottom", offset: -2, fill: "#475569", fontSize: 10 }}
                    />
                    <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Past months — muted */}
                    {pastMonths.map((ms, i) => (
                        <Line
                            key={ms.month}
                            type="monotone"
                            dataKey={ms.month}
                            name={MONTH_LABEL(ms.month)}
                            stroke={MUTED_PALETTES[i % MUTED_PALETTES.length]}
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                        />
                    ))}

                    {/* Current month — bold */}
                    {currentMonth && (
                        <Line
                            key={currentMonth.month}
                            type="monotone"
                            dataKey={currentMonth.month}
                            name={MONTH_LABEL(currentMonth.month)}
                            stroke={CURRENT_PALETTE}
                            strokeWidth={2.5}
                            dot={false}
                            connectNulls
                        />
                    )}

                    {/* Projected — dashed */}
                    {projectionKey && (
                        <Line
                            key={projectionKey}
                            type="monotone"
                            dataKey={projectionKey}
                            name="Projected"
                            stroke={PROJECTED_COLOR}
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                            dot={false}
                            connectNulls
                        />
                    )}

                    {/* Today marker */}
                    {lastDay > 0 && (
                        <ReferenceLine
                            x={lastDay}
                            stroke="#f97316"
                            strokeDasharray="3 3"
                            label={{ value: "Today", position: "top", fill: "#f97316", fontSize: 9 }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
