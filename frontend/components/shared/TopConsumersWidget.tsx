"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, Snowflake, Tv, WashingMachine, Zap } from "lucide-react"

export type TopConsumerData = {
    rank: number;
    name: string;
    kwh: number;
    cost: number;
}

interface TopConsumersWidgetProps {
    data: TopConsumerData[];
}

function getApplianceIcon(name: string) {
    const l = name.toLowerCase()
    if (l.includes("ac") || l.includes("conditioner")) return <Snowflake className="h-4 w-4 text-blue-400" />
    if (l.includes("fridge") || l.includes("refrigerator")) return <Snowflake className="h-4 w-4 text-blue-300" />
    if (l.includes("tv") || l.includes("television")) return <Tv className="h-4 w-4 text-purple-400" />
    if (l.includes("heater") || l.includes("geyser")) return <Flame className="h-4 w-4 text-orange-400" />
    if (l.includes("wash") || l.includes("laundry")) return <WashingMachine className="h-4 w-4 text-pink-400" />
    return <Zap className="h-4 w-4 text-emerald-400" />
}

export function TopConsumersWidget({ data }: TopConsumersWidgetProps) {
    if (!data || data.length === 0) return null;

    // For calculating relative widths, find max
    const maxKwh = Math.max(...data.map(d => d.kwh));

    return (
        <Card className="border-slate-800 bg-card h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-xl">Top Consuming Appliances</CardTitle>
                <CardDescription>Major energy drivers ranked by usage</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="divide-y divide-slate-800/50 h-full overflow-auto">
                    {data.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center gap-4 hover:bg-slate-800/20 transition-colors group">
                            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                {item.rank}
                            </div>

                            <div className="flex-shrink-0 p-2 bg-slate-900 rounded-lg border border-slate-800">
                                {getApplianceIcon(item.name)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-200 truncate">{item.name}</p>
                                <div className="mt-2 w-full flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors"
                                            style={{ width: `${Math.max(5, (item.kwh / maxKwh) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 w-16 text-right shrink-0">
                                        {item.kwh.toFixed(1)} kWh
                                    </span>
                                </div>
                            </div>

                            <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-bold text-slate-300">₹{item.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
