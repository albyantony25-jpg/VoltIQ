"use client";

import { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
    weekdayAvg: number;
    weekendAvg: number;
    // optional per-category breakdown (fraction of total)
    categories?: { name: string; weekday: number; weekend: number; color: string }[];
}

const DEFAULT_CATEGORIES = [
    { name: "HVAC", weekday: 0.38, weekend: 0.42, color: "#38bdf8" },
    { name: "Kitchen", weekday: 0.22, weekend: 0.28, color: "#fb923c" },
    { name: "Entertainment", weekday: 0.18, weekend: 0.22, color: "#a78bfa" },
    { name: "Lighting", weekday: 0.12, weekend: 0.05, color: "#facc15" },
    { name: "Other", weekday: 0.10, weekend: 0.03, color: "#4ade80" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + p.value, 0);
    return (
        <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
            <p className="font-semibold text-slate-200 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex justify-between gap-4 mb-0.5">
                    <span style={{ color: p.fill }}>{p.name}</span>
                    <span className="text-slate-300">{p.value.toFixed(2)} kWh</span>
                </div>
            ))}
            <div className="border-t border-slate-700 mt-2 pt-1.5 flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="font-bold text-white">{total.toFixed(2)} kWh</span>
            </div>
        </div>
    );
};

export default function WeekdayVsWeekendChart({
    weekdayAvg,
    weekendAvg,
    categories = DEFAULT_CATEGORIES,
}: Props) {

    const chartData = useMemo(() => [
        {
            label: "Weekday Avg",
            ...Object.fromEntries(
                categories.map((c) => [c.name, +(weekdayAvg * c.weekday).toFixed(2)])
            ),
        },
        {
            label: "Weekend Avg",
            ...Object.fromEntries(
                categories.map((c) => [c.name, +(weekendAvg * c.weekend).toFixed(2)])
            ),
        },
    ], [weekdayAvg, weekendAvg, categories]);

    const diffPct = weekdayAvg > 0
        ? ((weekendAvg - weekdayAvg) / weekdayAvg * 100)
        : 0;

    const topCat = useMemo(() => {
        const scores = categories.map((c) => ({
            name: c.name,
            increase: Math.abs(c.weekend - c.weekday),
        }));
        scores.sort((a, b) => b.increase - a.increase);
        return scores[0]?.name ?? "HVAC";
    }, [categories]);

    return (
        <div className="w-full">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-white">Weekday vs Weekend</h3>
                <p className="text-xs text-slate-400">Average daily consumption by category</p>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    barCategoryGap="30%"
                    barGap={4}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
                    {categories.map((cat) => (
                        <Bar key={cat.name} dataKey={cat.name} stackId="a" fill={cat.color} radius={[0, 0, 0, 0]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>

            {/* Summary text */}
            <div className="mt-4 p-3 rounded-lg bg-card border border-border text-xs">
                {Math.abs(diffPct) < 1 ? (
                    <p className="text-slate-300">Your weekday and weekend usage is nearly identical.</p>
                ) : diffPct > 0 ? (
                    <p className="text-slate-300">
                        You use{" "}
                        <span className="font-semibold text-orange-400">{diffPct.toFixed(0)}% more</span>{" "}
                        energy on weekends, mainly due to{" "}
                        <span className="font-semibold text-white">{topCat}</span>.
                    </p>
                ) : (
                    <p className="text-slate-300">
                        You use{" "}
                        <span className="font-semibold text-emerald-400">{Math.abs(diffPct).toFixed(0)}% more</span>{" "}
                        energy on weekdays, mainly due to{" "}
                        <span className="font-semibold text-white">{topCat}</span>.
                    </p>
                )}
            </div>
        </div>
    );
}
