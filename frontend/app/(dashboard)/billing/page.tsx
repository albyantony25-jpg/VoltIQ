"use client"

// Layout: 3 KPI cards on top, then 2-column grid (chart left, breakdown right), then appliance table
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
const BillTrendChart = dynamic(() => import("@/components/charts/BillTrendChart").then(mod => mod.BillTrendChart), { ssr: false })
const SlabBreakdownChart = dynamic(() => import("@/components/charts/SlabBreakdownChart").then(mod => mod.SlabBreakdownChart), { ssr: false })
const ApplianceCostTable = dynamic(() => import("@/components/charts/ApplianceCostTable").then(mod => mod.ApplianceCostTable), { ssr: false })
import { BillPredictionCard } from "@/components/shared/BillPredictionCard"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpRight, Zap, TrendingDown } from "lucide-react"
import { fetchApi } from "@/lib/api"

export default function BillingDashboardPage() {
    // 1. Fetch homes to get the active home ID
    const { data: homes = [], isLoading: loadingHomes } = useQuery({
        queryKey: ['homes'],
        queryFn: () => fetchApi('/homes/')
    })
    const activeHome = homes[0]

    // Fetch history and trends
    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['billing_history', activeHome?.id],
        queryFn: () => fetchApi(`/billing/${activeHome?.id}/history`),
        enabled: !!activeHome?.id
    })

    // Fetch predictions
    const { data: predictionData, isLoading: predictionLoading } = useQuery({
        queryKey: ['billing_prediction', activeHome?.id],
        queryFn: () => fetchApi(`/billing/${activeHome?.id}/predict`),
        enabled: !!activeHome?.id
    })

    // Fetch current month detailed breakdown
    const currentMonth = new Date().toISOString().substring(0, 7)
    const { data: currentBillData, isLoading: currentBillLoading } = useQuery({
        queryKey: ['billing_current', activeHome?.id, currentMonth],
        queryFn: () => fetchApi(`/billing/simulate`, {
            method: 'POST',
            body: JSON.stringify({ total_units: 450, tariff_id: "MAH-01" })
        }),
        enabled: !!activeHome?.id
    })

    // Mock appliance attribution mapping since backend simulation only calculates total numbers right now
    const mockAppliances = currentBillData ? [
        { appliance_name: "Samsung 1.5T AC (Master Bed)", monthly_kwh: 145.2, cost_inr: currentBillData.total_bill * 0.32, pct_of_bill: 32.2 },
        { appliance_name: "LG Double Door Refrigerator", monthly_kwh: 95.5, cost_inr: currentBillData.total_bill * 0.21, pct_of_bill: 21.2 },
        { appliance_name: "Sony 55' OLED TV", monthly_kwh: 45.0, cost_inr: currentBillData.total_bill * 0.10, pct_of_bill: 10.0 },
        { appliance_name: "V-Guard Water Heater", monthly_kwh: 80.0, cost_inr: currentBillData.total_bill * 0.17, pct_of_bill: 17.7 },
        { appliance_name: "Miscellaneous (Lights)", monthly_kwh: 84.3, cost_inr: currentBillData.total_bill * 0.18, pct_of_bill: 18.9 },
    ] : []

    // Map history to chart format
    const chartTrendData = historyData?.history?.map((b: any) => ({
        month: b.billing_month,
        amount: b.total_amount_inr,
        units: b.units_consumed
    })) || []

    if (!historyLoading && !currentBillLoading && chartTrendData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                    <TrendingDown className="h-10 w-10 text-slate-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">No Billing Data Yet</h2>
                <p className="text-slate-400">Set up your tariff to see bill estimates.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-50">Energy & Billing Analytics</h1>
                    <p className="text-slate-400 mt-1">Comprehensive breakdown of your usage trends and cost attributions.</p>
                </div>
            </div>

            {/* TOP KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KPI 1: Prediction */}
                <div className="h-[220px]">
                    {predictionLoading ? (
                        <Skeleton className="h-full w-full bg-slate-900 rounded-xl" />
                    ) : (
                        <BillPredictionCard
                            projected_amount={predictionData?.projected_amount || 0}
                            projected_units={predictionData?.projected_units || 0}
                            confidence={predictionData?.confidence || 0.85}
                            range_low={predictionData?.range_low || 0}
                            range_high={predictionData?.range_high || 0}
                            days_elapsed={new Date().getDate()}
                        />
                    )}
                </div>

                {/* KPI 2: MoM Change */}
                <Card className="border-slate-800 bg-card p-6 h-[220px] flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400 mb-2">Month-over-Month Trend</p>
                    {historyLoading ? (
                        <Skeleton className="h-12 w-24 bg-slate-800" />
                    ) : (
                        <>
                            <div className="flex items-end gap-3">
                                <h3 className="text-5xl font-bold text-white">
                                    {Math.abs(historyData?.trend?.month_over_month_change_pct || 0).toFixed(1)}%
                                </h3>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                {historyData?.trend?.trend_direction === 'falling' ? (
                                    <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-sm font-semibold">
                                        <TrendingDown className="h-4 w-4 mr-1" /> Excellent
                                    </span>
                                ) : (
                                    <span className="flex items-center text-red-500 bg-red-500/10 px-2 py-1 rounded-md text-sm font-semibold">
                                        <ArrowUpRight className="h-4 w-4 mr-1" /> Rising costs
                                    </span>
                                )}
                                <span className="text-slate-500 text-sm">vs last month</span>
                            </div>
                        </>
                    )}
                </Card>

                {/* KPI 3: Units Consumed */}
                <Card className="border-slate-800 bg-card p-6 h-[220px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-emerald-500/10">
                        <Zap className="h-24 w-24" />
                    </div>
                    <p className="text-sm font-medium text-slate-400 mb-2 relative z-10">Total Usage (Current Month)</p>
                    {predictionLoading ? (
                        <Skeleton className="h-12 w-32 bg-slate-800 relative z-10" />
                    ) : (
                        <>
                            <h3 className="text-5xl font-bold text-emerald-400 relative z-10 font-mono tracking-tight">
                                {(predictionData?.projected_units * (new Date().getDate() / 30) || 145).toFixed(0)} <span className="text-2xl text-emerald-600">kWh</span>
                            </h3>
                            <p className="text-sm text-slate-500 mt-4 relative z-10">Equivalent to ~{(145 * 0.82).toFixed(1)} kg of CO₂</p>
                        </>
                    )}
                </Card>
            </div>

            {/* MIDDLE ROW: Chart Left, Breakdown Right */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[400px]">
                <div className="lg:col-span-3 h-full">
                    {historyLoading ? (
                        <Skeleton className="w-full h-full bg-slate-900 rounded-xl" />
                    ) : (
                        <BillTrendChart
                            data={chartTrendData}
                            momChangePct={historyData?.trend?.month_over_month_change_pct}
                        />
                    )}
                </div>
                <div className="lg:col-span-2 h-full">
                    {currentBillLoading ? (
                        <Skeleton className="w-full h-full bg-slate-900 rounded-xl" />
                    ) : (
                        <SlabBreakdownChart slabs={currentBillData?.energy_charge?.slabs || []} />
                    )}
                </div>
            </div>

            {/* BOTTOM ROW: Appliance Table */}
            <div className="h-[450px] overflow-hidden flex flex-col">
                {currentBillLoading ? (
                    <Skeleton className="w-full h-full bg-slate-900 rounded-xl" />
                ) : (
                    <div className="overflow-x-auto w-full flex-1 rounded-xl border border-slate-800">
                        <ApplianceCostTable appliances={mockAppliances} />
                    </div>
                )}
            </div>

        </div>
    )
}
