"use client"

import { useQuery } from "@tanstack/react-query"
import { KPICard } from "@/components/shared/KPICard"
import { ConsumptionChart } from "@/components/charts/ConsumptionChart"
import { HomeScoreGauge } from "@/components/shared/HomeScoreGauge"
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart"
import { TopConsumersWidget } from "@/components/shared/TopConsumersWidget"
import { RecentAlertsWidget } from "@/components/shared/RecentAlertsWidget"
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton"
import { Zap, IndianRupee, Target, Leaf } from "lucide-react"

export default function OverviewDashboardPage() {
    // 1. Fetch user's home id
    const { data: homes, isLoading: isHomesLoading } = useQuery({
        queryKey: ['user_homes'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/homes/`)
            if (!res.ok) throw new Error("Failed to fetch homes")
            return res.json()
        }
    })

    const activeHomeId = homes?.[0]?.id

    // 2. Fetch analytics for that home
    const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ['analytics_overview', activeHomeId],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/${activeHomeId}/overview`)
            if (!res.ok) throw new Error("Failed to fetch analytics overview")
            return res.json()
        },
        enabled: !!activeHomeId,
        staleTime: 5 * 60 * 1000 // 5 minutes fresh
    })

    if (isHomesLoading || isAnalyticsLoading || !analytics) {
        return <DashboardSkeleton />
    }

    const { kpis, consumption_history, categories, top_consumers, alerts } = analytics;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center mb-8 mt-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Home Intelligence</h1>
                    <p className="text-slate-400 mt-1">Real-time pulse of your VoltIQ-managed energy environment.</p>
                </div>
            </div>

            {/* ROW 1: KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 h-auto lg:h-[160px]">
                <KPICard
                    title="Monthly Usage"
                    value={kpis.monthly_kwh.value.toFixed(1)}
                    unit="kWh"
                    change_pct={kpis.monthly_kwh.change_pct}
                    change_direction={kpis.monthly_kwh.direction}
                    icon={<Zap className="w-5 h-5" />}
                    color="#3b82f6" // blue
                    index={0}
                />
                <KPICard
                    title="Estimated Bill"
                    value={`₹${kpis.estimated_bill.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    change_pct={kpis.estimated_bill.change_pct}
                    change_direction={kpis.estimated_bill.direction}
                    icon={<IndianRupee className="w-5 h-5" />}
                    color="#f59e0b" // yellow
                    index={1}
                />
                <KPICard
                    title="Efficiency Score"
                    value={kpis.efficiency_score.value}
                    unit="/ 100"
                    change_pct={kpis.efficiency_score.change_pct}
                    change_direction={kpis.efficiency_score.direction}
                    icon={<Target className="w-5 h-5" />}
                    color="#10b981" // green
                    index={2}
                />
                <KPICard
                    title="Carbon Footprint"
                    value={Math.round(kpis.co2_kg.value)}
                    unit="kg CO₂"
                    change_pct={kpis.co2_kg.change_pct}
                    change_direction={kpis.co2_kg.direction}
                    icon={<Leaf className="w-5 h-5" />}
                    color="#ec4899" // pink
                    index={3}
                />
            </div>

            {/* ROW 2: Consumption Trend & Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[400px]">
                <div className="lg:col-span-3 h-full">
                    <ConsumptionChart data={consumption_history} />
                </div>
                <div className="lg:col-span-2 h-full">
                    <HomeScoreGauge score={kpis.efficiency_score.value} subscores={kpis.efficiency_score.subscores} />
                </div>
            </div>

            {/* ROW 3: Category Breakdown & Top Consumers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[380px]">
                <div className="h-full">
                    <CategoryBreakdownChart data={categories} />
                </div>
                <div className="h-full">
                    <TopConsumersWidget data={top_consumers} />
                </div>
            </div>

            {/* ROW 4: Alerts */}
            <div className="col-span-1 h-auto min-h-[250px]">
                <RecentAlertsWidget alerts={alerts} />
            </div>

        </div>
    )
}
