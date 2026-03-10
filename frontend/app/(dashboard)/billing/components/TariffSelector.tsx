"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export type Tariff = {
    id: string;
    state: string;
    provider: string;
    fixed_charge_inr: number;
    fuel_surcharge_pct: number;
    electricity_duty_pct: number;
    slab_config: any[];
}

interface TariffSelectorProps {
    tariffs: Tariff[];
    selectedId: string;
    onSelect: (val: string) => void;
    isLoading?: boolean;
}

export function TariffSelector({ tariffs, selectedId, onSelect, isLoading }: TariffSelectorProps) {
    const activeTariff = tariffs.find(t => t.id === selectedId);

    return (
        <Card className="border-slate-800 bg-card">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">Active Tariff Plan</CardTitle>
                        <CardDescription>Select a DISCOM to simulate bill structures</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">

                <Select value={selectedId} onValueChange={onSelect} disabled={isLoading}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 pt-6 pb-6 text-sm font-semibold">
                        <SelectValue placeholder="Select Tariff..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {tariffs.map(t => (
                            <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                                {t.state} - {t.provider}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {activeTariff && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-slate-800 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 min-w-[8px] bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold text-emerald-400 text-sm">{activeTariff.provider} Rates Applied</span>
                            <Badge variant="outline" className="ml-auto bg-slate-900 border-slate-700 text-slate-300">
                                Fixed: ₹{activeTariff.fixed_charge_inr}
                            </Badge>
                        </div>

                        <div className="space-y-2 mt-4 pt-3 border-t border-slate-800 relative z-0">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Active Slab Structure</p>
                            {activeTariff.slab_config.map((slab, i) => (
                                <div key={i} className="flex justify-between items-center text-sm group">
                                    <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
                                        {slab.from} {slab.to ? `- ${slab.to}` : '+'} units
                                    </span>
                                    <span className="font-mono text-slate-300 group-hover:text-amber-400 transition-colors">
                                        ₹{slab.rate.toFixed(2)}/unit
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center text-xs mt-3 pt-2 text-slate-500">
                                <span>Duty & Surcharge</span>
                                <span>{((activeTariff.electricity_duty_pct + activeTariff.fuel_surcharge_pct) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
