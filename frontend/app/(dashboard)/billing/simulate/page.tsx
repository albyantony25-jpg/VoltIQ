"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SlabBreakdownChart } from "@/components/charts/SlabBreakdownChart"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, Calculator } from "lucide-react"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { fetchApi } from "@/lib/api"

export default function BillSimulatorPage() {
    const [selectedTariffId, setSelectedTariffId] = useState<string>("MAH-01")
    const [units, setUnits] = useState<number>(450)
    const debouncedUnits = useDebounce(units, 300)

    // Fetch public tariffs
    const { data: tariffs, isLoading: tariffsLoading } = useQuery({
        queryKey: ['tariffs'],
        queryFn: () => fetchApi('/billing/tariffs')
    })

    // Current fixed benchmark (what they pay now)
    const { data: currentBill, isLoading: currentBillLoading } = useQuery({
        queryKey: ['billing_simulate', "MAH-01", 450],
        queryFn: () => fetchApi('/billing/simulate', {
            method: 'POST',
            body: JSON.stringify({ total_units: 450, tariff_id: "MAH-01" })
        }),
        staleTime: Infinity // Don't refetch the benchmark constantly
    })

    // Simulated Bill
    const { data: simBill, isFetching: simFetching } = useQuery({
        queryKey: ['billing_simulate', selectedTariffId, debouncedUnits],
        queryFn: () => fetchApi('/billing/simulate', {
            method: 'POST',
            body: JSON.stringify({ total_units: debouncedUnits, tariff_id: selectedTariffId })
        }),
        enabled: !!selectedTariffId // wait until tariff is loaded
    })

    // Helpers to display
    const currentTotal = currentBill?.total_bill || 0
    const simTotal = simBill?.total_bill || 0
    const savings = currentTotal - simTotal
    const isSaving = savings > 0 && Math.abs(savings) > 1

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Calculator className="h-8 w-8 text-indigo-400" />
                        What-If Engine
                    </h1>
                    <p className="text-slate-400 mt-1">Simulate changes in consumption or swap to alternative DISCOM structures.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* CONTROLS (Left col) */}
                <Card className="xl:col-span-1 border-slate-800 bg-card h-fit sticky top-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Simulation Params</CardTitle>
                        <CardDescription>Adjust sliders to instantly compute the bill.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-300">DISCOM Provider</label>
                            {tariffsLoading ? (
                                <Skeleton className="h-10 w-full bg-slate-800" />
                            ) : (
                                <Select value={selectedTariffId} onValueChange={setSelectedTariffId}>
                                    <SelectTrigger className="w-full bg-slate-900 border-slate-700">
                                        <SelectValue placeholder="Select Tariff..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tariffs?.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                                                {t.state} - {t.provider}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-300">Monthly Usage</label>
                                <span className="font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs">{units} kWh</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1000"
                                step="10"
                                value={units}
                                onChange={(e) => setUnits(parseInt(e.target.value))}
                                className="w-full accent-indigo-500 hover:accent-indigo-400 cursor-grab h-2 bg-slate-800 rounded-lg appearance-none"
                            />
                            <div className="flex justify-between text-xs text-slate-500 font-mono">
                                <span>0</span>
                                <span>1000+</span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <p className="text-slate-400 text-xs text-center">Changes are debounced by 300ms to prevent API flooding.</p>
                        </div>

                    </CardContent>
                </Card>

                {/* COMPARISON RESULTS (Right col x 3) */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Header Diff */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Current / Benchmark */}
                        <Card className="border-slate-800 bg-slate-900 border-dashed">
                            <CardContent className="p-6">
                                <p className="text-sm font-medium text-slate-400 mb-2">Current Baseline</p>
                                <h3 className="text-3xl font-bold text-slate-300">₹{currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <p className="text-sm text-slate-500 mt-1">450 kWh (Maharashtra MSEDCL)</p>
                            </CardContent>
                        </Card>

                        {/* Arrow */}
                        <div className="hidden md:flex items-center justify-center">
                            <ArrowRight className="h-10 w-10 text-slate-600" />
                        </div>

                        {/* Simulated */}
                        <Card className={`border ${simFetching ? 'border-indigo-500/50 outline outline-1 outline-indigo-500/50' : 'border-slate-800'} bg-card transition-all duration-300 relative overflow-hidden`}>
                            {simFetching && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse"></div>}
                            <CardContent className="p-6">
                                <p className="text-sm font-medium text-slate-400 mb-2 group flex items-center gap-2">Simulated Outcome</p>
                                <div className="flex items-end gap-3">
                                    <h3 className="text-3xl font-bold text-white">₹{simTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                </div>
                                <div className="mt-2 h-6">
                                    {savings !== 0 && (
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${isSaving ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                                            {isSaving ? `₹${Math.abs(savings).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Savings` : `+₹${Math.abs(savings).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Increase`}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown Graphs */}
                    <div className="h-[450px]">
                        {simFetching && !simBill ? (
                            <Skeleton className="w-full h-full bg-slate-900 rounded-xl" />
                        ) : (
                            <SlabBreakdownChart slabs={simBill?.energy_charge?.slabs || []} />
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
