"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

export type TrendData = {
    month: string;
    amount: number;
    units: number;
}

interface BillTrendChartProps {
    data: TrendData[];
    momChangePct?: number;
}

export function BillTrendChart({ data, momChangePct = 0 }: BillTrendChartProps) {
    const isUp = momChangePct > 0;

    // Sort data chronologically if needed (assuming frontend receives it sorted oldest to newest)
    const chartData = useMemo(() => {
        return [...data].reverse(); // if backend gives newest first
    }, [data])

    return (
        <Card className="border-slate-800 bg-card w-full h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">6-Month Trend</CardTitle>
                        <CardDescription>Historical bill projection & usage</CardDescription>
                    </div>
                    {momChangePct !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-md ${isUp ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {isUp ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                            {Math.abs(momChangePct).toFixed(1)}% vs Last Month
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] pt-4">
                {data.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">
                        No history available.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-blue, #3b82f6)" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="var(--chart-blue, #3b82f6)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                            <XAxis
                                dataKey="month"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    // expects "YYYY-MM"
                                    if (!val) return "";
                                    const d = new Date(val + "-01");
                                    return d.toLocaleString('en-US', { month: 'short' });
                                }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `₹${val}`}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                                <p className="text-slate-400 text-xs mb-1 font-semibold">{label}</p>
                                                <p className="text-emerald-400 font-bold text-lg">
                                                    ₹{payload[0].value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-slate-500 text-xs mt-1">
                                                    Usage: {payload[0].payload.units} kWh
                                                </p>
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="var(--chart-blue, #3b82f6)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorAmount)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
