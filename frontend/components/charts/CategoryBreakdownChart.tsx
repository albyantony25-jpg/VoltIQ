"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

export type CategoryData = {
    name: string;
    kwh: number;
    pct: number;
    color: string;
}

interface CategoryBreakdownChartProps {
    data: CategoryData[];
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
    if (!data || data.length === 0) return null;

    const totalKwh = data.reduce((acc, cur) => acc + cur.kwh, 0);

    return (
        <Card className="border-slate-800 bg-card h-full flex flex-col">
            <CardHeader className="pb-0">
                <CardTitle className="text-xl">Energy by Category</CardTitle>
                <CardDescription>Major consumption zones in your home</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col sm:flex-row items-center justify-center p-6 gap-6">
                <div className="flex-1 w-full h-[250px] relative">
                    <div className="absolute inset-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="kwh"
                                animationDuration={1000}
                                stroke="transparent"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                                                <div>
                                                    <p className="text-slate-200 text-sm font-semibold">{d.name}</p>
                                                    <p className="text-slate-400 text-xs mt-0.5">
                                                        <span className="text-white font-mono">{d.kwh.toFixed(1)}</span> kWh
                                                        <span className="text-slate-600 mx-1">•</span>
                                                        {d.pct.toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Inner Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-white tracking-tight">{Math.round(totalKwh)}</span>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total kWh</span>
                    </div>
                </div>

                <div className="w-full sm:w-1/2 flex-shrink-0 mt-6 sm:mt-0 px-4 max-h-[250px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <div className="space-y-3 pr-2 py-1">
                        {data.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-slate-200 group-hover:text-white block">{item.pct.toFixed(1)}%</span>
                                    <span className="text-[10px] text-slate-500 font-mono">{item.kwh.toFixed(1)} kWh</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
