"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export type SlabResult = {
    from: number;
    to: number | null;
    units_consumed: number;
    rate: number;
    charge: number;
}

interface SlabBreakdownChartProps {
    slabs: SlabResult[];
}

export function SlabBreakdownChart({ slabs }: SlabBreakdownChartProps) {
    if (!slabs || slabs.length === 0) return null;

    // Color gradient palette for slabs
    const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

    const chartData = slabs.map((s, i) => ({
        name: `${s.from}${s.to ? `-${s.to}` : '+'}`,
        units: s.units_consumed,
        charge: s.charge,
        color: COLORS[i % COLORS.length]
    }))

    return (
        <Card className="border-slate-800 bg-card h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl">Energy Slabs Breakdown</CardTitle>
                <CardDescription>Units split across tiered pricing</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-4">
                <div className="h-[200px] w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                            <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}u`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                                <p className="text-slate-400 text-xs font-semibold mb-1">Tier: {d.name}</p>
                                                <p className="text-slate-200 font-bold text-sm">
                                                    {d.units.toFixed(1)} <span className="text-xs text-slate-500 font-normal">kWh</span>
                                                </p>
                                                <p className="text-emerald-400 font-bold text-sm mt-1">
                                                    ₹{d.charge.toFixed(2)}
                                                </p>
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="units" radius={[4, 4, 0, 0]} animationDuration={1000}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-md border border-slate-800 overflow-hidden text-sm flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="py-2 px-3">Slab Limit</th>
                                <th className="py-2 px-3 text-right">Units</th>
                                <th className="py-2 px-3 text-right">Rate</th>
                                <th className="py-2 px-3 text-right">Charge</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {slabs.map((slab, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/20">
                                    <td className="py-2 px-3 text-slate-300 font-medium">
                                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                        {slab.from}{slab.to ? ` - ${slab.to}` : '+'}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-400">{slab.units_consumed.toFixed(1)}</td>
                                    <td className="py-2 px-3 text-right text-slate-400">₹{slab.rate.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-right text-slate-200 font-semibold">₹{slab.charge.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
