"use client"

import { useQuery } from "@tanstack/react-query"
import { HomeScoreGauge } from "@/components/shared/HomeScoreGauge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Leaf, Award, BarChart3, Cloud, MapPin } from "lucide-react"

export default function EfficiencyScorecardPage() {
    const MOCK_HOME_ID = "00000000-0000-0000-0000-000000000000"

    // Use the analytics overview endpoint to get the score data
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics_overview', MOCK_HOME_ID],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/${MOCK_HOME_ID}/overview`)
            if (!res.ok) throw new Error("Failed to fetch analytics overview")
            return res.json()
        },
        staleTime: 5 * 60 * 1000
    })

    if (isLoading || !analytics) {
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

    const scoreData = analytics.kpis.efficiency_score;
    const co2 = analytics.kpis.co2_kg.value;

    return (
        <div className="space-y-8 pb-12">

            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mt-4 mb-8">
                <h1 className="text-4xl font-black tracking-tight text-white mb-2">Efficiency Scorecard</h1>
                <p className="text-slate-400 text-lg">Your home's performance ranked against regional baselines.</p>
            </div>

            {/* Main Gauge (Hero) */}
            <div className="max-w-md mx-auto h-[320px] mb-12 animate-in zoom-in-95 duration-700">
                <HomeScoreGauge score={scoreData.value} subscores={scoreData.subscores} />
            </div>

            {/* 3 Panels Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Panel 1: Appliance Efficiency */}
                <Card className="border-slate-800 bg-slate-900/50">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-400" />
                            Appliance Rating
                        </CardTitle>
                        <CardDescription>Hardware eco-ratings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-300 font-medium">Samsung AC</span>
                            <span className="font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">A+++</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-300 font-medium">LG Refrigerator</span>
                            <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">A++</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-300 font-medium">Water Heater</span>
                            <span className="font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">B</span>
                        </div>
                        <div className="pt-2">
                            <p className="text-xs text-slate-500 text-center leading-relaxed">
                                Upgrading your Water Heater to an A-class model could increase your overall score by +4 points.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Panel 2: Usage Behavior */}
                <Card className="border-slate-800 bg-slate-900/50">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-400" />
                            Behavior Patterns
                        </CardTitle>
                        <CardDescription>Usage discipline rating</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-400">Peak Hour Avoidance</span>
                                <span className="text-blue-400">92/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[92%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-400">Standby Waste Control</span>
                                <span className="text-amber-400">65/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[65%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-400">Consistency (Variance)</span>
                                <span className="text-emerald-400">88/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[88%]"></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Panel 3: Peer Comparison */}
                <Card className="border-slate-800 bg-slate-900/50 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 transition-colors group-hover:bg-indigo-500/10"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-indigo-400" />
                            Peer Comparison
                        </CardTitle>
                        <CardDescription>Compared to Mumbai apartments</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-4 text-center">
                        <h3 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Top 23%</h3>
                        <p className="text-sm font-medium text-emerald-400 bg-emerald-400/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm mb-6">
                            You use 18% less energy
                        </p>

                        {/* CSS Bell curve approx (visualization only) */}
                        <div className="relative h-12 w-full mt-2">
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
                            <div className="absolute -top-4 text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded shadow-lg" style={{ left: '23%', transform: 'translateX(-50%)' }}>You</div>
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
                            <circle cx="80" cy="80" r="70" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray="440" strokeDashoffset={440 - (440 * scoreData.subscores.sustainability / 100)} className="transition-all duration-1000 ease-out delay-500" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Cloud className="h-6 w-6 text-emerald-500/50 mb-1" />
                            <span className="text-3xl font-black text-white">{scoreData.subscores.sustainability}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
