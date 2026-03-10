"use client"

import { useMemo, useState } from "react"
import { Bar, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ConsumptionData = {
    date: string;
    kwh: number;
    avg_7d: number;
}

interface ConsumptionChartProps {
    data: ConsumptionData[];
}

export function ConsumptionChart({ data }: ConsumptionChartProps) {
    const [range, setRange] = useState("30") // 7, 30

    const chartData = useMemo(() => {
        const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        return sorted.slice(-parseInt(range)); // simple slice since data is exactly 30 days
    }, [data, range])

    return (
        <Card className="border-slate-800 bg-card h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">Consumption Overview</CardTitle>
                        <CardDescription>Daily usage vs 7-day rolling average</CardDescription>
                    </div>
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-[120px] bg-slate-900 border-slate-700 h-8 text-xs">
                            <SelectValue placeholder="Last 30 Days" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] pt-4">
                {chartData.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">
                        No consumption data available.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    if (!val) return "";
                                    const d = new Date(val);
                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}k`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                                <p className="text-slate-400 text-xs mb-2 font-semibold border-b border-slate-700 pb-2">{label}</p>
                                                {payload.map((entry: any, index: number) => (
                                                    <div key={`item-${index}`} className="flex items-center justify-between gap-6 mb-1">
                                                        <span className="text-slate-300 text-xs flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                            {entry.name === 'kwh' ? 'Daily Usage' : '7D Average'}
                                                        </span>
                                                        <span className="font-bold text-sm text-white">
                                                            {entry.value.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">kWh</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="kwh"
                                fill="var(--chart-blue, #3b82f6)"
                                radius={[4, 4, 0, 0]}
                                animationDuration={1000}
                                maxBarSize={40}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="avg_7d"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: "#f59e0b", stroke: "#000", strokeWidth: 2 }}
                                animationDuration={1000}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
