"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BatteryCharging, Flame, Snowflake, Tv, Zap, Monitor, Sparkles, SettingsIcon } from "lucide-react"

export type ApplianceCostAttribution = {
    appliance_name: string;
    monthly_kwh: number;
    cost_inr: number;
    pct_of_bill: number;
};

interface ApplianceCostTableProps {
    appliances: ApplianceCostAttribution[];
}

function getApplianceIcon(name: string) {
    const l = name.toLowerCase()
    if (l.includes("ac") || l.includes("conditioner")) return <Snowflake className="h-4 w-4 text-blue-400" />
    if (l.includes("fridge") || l.includes("refrigerator")) return <Snowflake className="h-4 w-4 text-blue-300" />
    if (l.includes("tv") || l.includes("television")) return <Tv className="h-4 w-4 text-purple-400" />
    if (l.includes("heater") || l.includes("geyser")) return <Flame className="h-4 w-4 text-orange-400" />
    if (l.includes("pc") || l.includes("computer")) return <Monitor className="h-4 w-4 text-slate-300" />
    if (l.includes("lights")) return <Sparkles className="h-4 w-4 text-yellow-400" />
    return <Zap className="h-4 w-4 text-emerald-400" />
}

function getProgressColor(pct: number) {
    if (pct > 30) return "bg-red-500"
    if (pct > 15) return "bg-amber-500"
    return "bg-emerald-500"
}

export function ApplianceCostTable({ appliances }: ApplianceCostTableProps) {
    // Enforce sorted
    const sorted = [...appliances].sort((a, b) => b.cost_inr - a.cost_inr)

    return (
        <Card className="border-slate-800 bg-card h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl">Cost Drivers</CardTitle>
                <CardDescription>Top appliances consuming electricity this month</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                {appliances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 h-full border-t border-slate-800">
                        <BatteryCharging className="h-10 w-10 text-slate-600 mb-3" />
                        <p className="text-slate-400 font-medium">No active appliances</p>
                        <p className="text-sm text-slate-500 mt-1">Add devices to see real-time cost attribution.</p>
                    </div>
                ) : (
                    <div className="overflow-auto max-h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent sticky top-0 bg-card z-10">
                                    <TableHead className="text-slate-400 w-10">#</TableHead>
                                    <TableHead className="text-slate-400">Appliance</TableHead>
                                    <TableHead className="text-right text-slate-400">Usage</TableHead>
                                    <TableHead className="text-left text-slate-400 px-4">Bill Impact</TableHead>
                                    <TableHead className="text-right text-slate-400">Est. Cost</TableHead>
                                    <TableHead className="text-right text-slate-400 w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sorted.map((app, idx) => (
                                    <TableRow key={idx} className="border-slate-800/50 hover:bg-slate-800/30">
                                        <TableCell className="font-medium text-slate-600 text-xs">{idx + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-900 rounded-md border border-slate-800">
                                                    {getApplianceIcon(app.appliance_name)}
                                                </div>
                                                <span className="font-semibold text-slate-200">{app.appliance_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-slate-400 text-xs">
                                            {app.monthly_kwh.toFixed(1)} kWh
                                        </TableCell>
                                        <TableCell className="px-4 w-40">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-slate-400 w-10 text-right">{app.pct_of_bill.toFixed(1)}%</span>
                                                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${getProgressColor(app.pct_of_bill)} rounded-full`}
                                                        style={{ width: `${Math.min(100, app.pct_of_bill)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-slate-200">
                                            ₹{app.cost_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button className="text-xs font-semibold px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors flex items-center justify-center gap-1 w-full border border-indigo-500/20">
                                                <SettingsIcon className="h-3 w-3" /> Fix
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
