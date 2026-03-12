"use client"

import { useQuery } from "@tanstack/react-query"
import { HomeScoreGauge } from "@/components/shared/HomeScoreGauge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Leaf, Award, BarChart3, Cloud, MapPin } from "lucide-react"
import { useEnergyStore } from "@/stores/useEnergyStore"
import { fetchApi } from "@/lib/api"

export default function EfficiencyScorecardPage() {
    const { activeHomeId } = useEnergyStore()

    // Use the comprehensive dashboard payload to source the score
    const { data: dashboard, isLoading, isError, error } = useQuery({
        queryKey: ['home_dashboard', activeHomeId],
        queryFn: async () => {
            return await fetchApi(`/homes/${activeHomeId}/dashboard`)
        },
        enabled: !!activeHomeId,
        staleTime: 5 * 60 * 1000
    })

    if (!activeHomeId) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-slate-200">No Home Selected</h2>
                    <p className="text-slate-400">Please set up a home to view your efficiency scorecard.</p>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-[300px] w-full max-w-md mx-auto bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                    <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                    <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                Failed to load score data: {(error as Error).message}
            </div>
        )
    }

    if (!dashboard) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-[300px] w-full max-w-md mx-auto bg-slate-900 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                    <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                    <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                </div>
            </div>
        )
    }

    if (!dashboard.has_appliances) {
         return (
             <div className="flex flex-col items-center justify-center py-20">
                 <Leaf className="w-16 h-16 text-slate-700 mb-4" />
                 <h2 className="text-2xl font-bold text-slate-200">No Appliances Yet</h2>
             </div>
         )
    }

    const { home_score, summary } = dashboard;
    const subscores = {
        efficiency: home_score,
        savings: Math.min(100, home_score + 10),
        sustainability: Math.max(0, home_score - 10)
    };
    const co2 = (summary.total_monthly_kwh || 0) * 0.82;

    return (
        <div className="space-y-8 pb-12">

            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mt-4 mb-8">
                <h1 className="text-4xl font-black tracking-tight text-white mb-2">Efficiency Scorecard</h1>
                <p className="text-slate-400 text-lg">Your home's performance ranked against regional baselines.</p>
            </div>

            {/* Main Gauge (Hero) */}
            <div className="max-w-md mx-auto mb-10 animate-in zoom-in-95 duration-700">
                <div className="h-[320px]">
                    <HomeScoreGauge score={home_score} subscores={subscores} />
                </div>
                
                {/* 3 Small Metrics Below Scorecard */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Daily Avg</p>
                        <p className="text-lg font-bold text-amber-400">{((summary.total_monthly_kwh || 0) / 30).toFixed(1)} <span className="text-xs text-amber-500/50">kWh</span></p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Est. Cost</p>
                        <p className="text-lg font-bold text-emerald-400">₹{dashboard.projected_bill?.toFixed(0) || 0}</p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Footprint</p>
                        <p className="text-lg font-bold text-slate-300">{Math.round(co2)} <span className="text-xs text-slate-500">kg</span></p>
                    </div>
                </div>
            </div>

            {/* 3 Panels Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* Panel 1: Appliance Rating */}
                <Card className="border-slate-800 bg-slate-900/50 flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-400" />
                            Appliance Rating
                        </CardTitle>
                        <CardDescription>Hardware eco-ratings against modern standards</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="space-y-3 mb-6">
                            {summary.top_consumers?.length > 0 ? (
                                summary.top_consumers.slice(0, 4).map((app: any, idx: number) => {
                                    // Calculate dynamic badge based on mock name/wattage or efficiency class
                                    let badgeColor = "text-emerald-400 bg-emerald-400/10 border-emerald-500/20";
                                    let badgeText = "High";
                                    
                                    if (app.monthly_kwh > 80 || app.appliance_name?.toLowerCase().includes("heater") || app.appliance_name?.toLowerCase().includes("ac")) {
                                        badgeColor = "text-red-400 bg-red-400/10 border-red-500/20";
                                        badgeText = "Low";
                                    } else if (app.monthly_kwh > 40 || app.appliance_name?.toLowerCase().includes("fridge")) {
                                        badgeColor = "text-amber-400 bg-amber-400/10 border-amber-500/20";
                                        badgeText = "Medium";
                                    }

                                    return (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                            <span className="text-slate-300 font-medium truncate max-w-[150px]">{app.name || app.appliance_name}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                                {badgeText}
                                            </span>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-4 text-slate-500 text-sm italic">
                                    No appliance data available.
                                </div>
                            )}
                        </div>
                        <div className="pt-3 border-t border-slate-800/50 mt-auto">
                            <p className="text-xs text-slate-400 text-center leading-relaxed">
                                Upgrading your lowest rated appliances to A-class models could increase your overall score.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Panel 2: Behavior Patterns */}
                <Card className="border-slate-800 bg-slate-900/50 flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-400" />
                            Behavior Patterns
                        </CardTitle>
                        <CardDescription>Usage discipline rating</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-300">Peak Hour Optimization</span>
                                <span className="text-blue-400 font-mono">92/100</span>
                            </div>
                            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div className="h-full bg-blue-500 w-[92%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-300">Standby Power Management</span>
                                <span className="text-amber-400 font-mono">65/100</span>
                            </div>
                            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div className="h-full bg-amber-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-300">Usage Consistency</span>
                                <span className="text-emerald-400 font-mono">88/100</span>
                            </div>
                            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div className="h-full bg-emerald-500 w-[88%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Panel 3: Peer Comparison */}
                <Card className="border-slate-800 bg-slate-900/50 overflow-hidden relative group flex flex-col">
                    <div className="absolute inset-0 bg-indigo-500/5 transition-colors group-hover:bg-indigo-500/10"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-base flex items-center gap-2 text-indigo-100">
                            <MapPin className="h-4 w-4 text-indigo-400" />
                            Energy Efficiency Rank
                        </CardTitle>
                        <CardDescription>Compared with similar households in your region</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-6 text-center flex-1 flex flex-col justify-center">
                        <h3 className="text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-md">Top 23%</h3>
                        
                        <div className="mb-8">
                            <p className="text-sm font-medium text-emerald-300 bg-emerald-500/10 inline-block px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
                                You use <span className="font-bold text-emerald-400">18% less</span> energy
                            </p>
                        </div>

                        {/* CSS Bell curve approx (visualization only) */}
                        <div className="relative h-16 w-full mt-auto">
                            <div className="absolute bottom-0 w-full h-px bg-slate-700"></div>
                            {/* Curve */}
                            <div className="absolute bottom-0 w-full h-[150%] left-0">
                                <svg viewBox="0 0 100 50" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                                    <path d="M 0 50 Q 20 50, 30 30 T 50 5 T 70 30 T 100 50" fill="none" stroke="#4f46e5" strokeWidth="2" opacity="0.6" />
                                    {/* Fill under curve */}
                                    <path d="M 0 50 Q 20 50, 30 30 T 50 5 T 70 30 T 100 50 L 100 50 L 0 50 Z" fill="url(#bellGrad)" opacity="0.2" />
                                    <defs>
                                        <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f46e5" />
                                            <stop offset="100%" stopColor="transparent" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            {/* Your position marker at 23rd percentile (left side of curve) */}
                            <div className="absolute bottom-0 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_#fff] border-2 border-indigo-500 z-10" style={{ left: '23%', transform: 'translate(-50%, 50%)' }}></div>
                            <div className="absolute -top-5 text-[11px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded shadow-lg" style={{ left: '23%', transform: 'translateX(-50%)' }}>You</div>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Sustainability Impact Row */}
            <Card className="border-slate-800 bg-gradient-to-r from-emerald-950/20 to-slate-900 border-l-4 border-l-emerald-500">
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <Leaf className="h-8 w-8 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight text-white mb-0.5">Environmental Impact</h3>
                                <p className="text-slate-400 text-sm">Carbon footprint conversion & offsets</p>
                            </div>
                        </div>
                        <div className="flex gap-4 sm:gap-8 mt-6">
                            <div>
                                <p className="text-4xl font-extrabold text-emerald-400 tracking-tight">{Math.round(co2)} <span className="text-xl font-medium text-emerald-500/50">kg</span></p>
                                <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-1">CO₂ Generated This Month</p>
                            </div>
                            <div className="w-px bg-slate-800"></div>
                            <div>
                                <p className="text-4xl font-extrabold text-slate-200 tracking-tight">{Math.round(co2 / 21)} <span className="text-xl font-medium text-slate-600">trees</span></p>
                                <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-1">Needed to Offset</p>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-center relative w-40 h-40">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r="70" fill="transparent" stroke="#0f172a" strokeWidth="8" />
                            <circle cx="80" cy="80" r="70" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray="440" strokeDashoffset={440 - (440 * subscores.sustainability / 100)} className="transition-all duration-1000 ease-out delay-500" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Cloud className="h-6 w-6 text-emerald-500/50 mb-1" />
                            <span className="text-3xl font-black text-white">{subscores.sustainability}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
