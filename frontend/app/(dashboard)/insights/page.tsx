"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { InsightCard } from "@/components/ai/InsightCard"
import { ForecastCard } from "@/components/ai/ForecastCard"
import { AnomalyAlert } from "@/components/ai/AnomalyAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Sparkles, BrainCircuit } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { useEnergyStore } from "@/stores/useEnergyStore"
import { fetchApi } from "@/lib/api"

export default function InsightsDashboardPage() {
    const queryClient = useQueryClient()
    const prefersReducedMotion = useReducedMotion()
    const { activeHomeId } = useEnergyStore()
    const TARGET_MONTH = "2026-02"

    // 1. Fetch cached insights
    const { data: insightsData, isLoading, isError } = useQuery({
        queryKey: ['insights', activeHomeId],
        queryFn: async () => {
            if (!activeHomeId) return null;
            try {
                const data = await fetchApi(`/insights/${activeHomeId}`)
                return data;
            } catch (err: any) {
                if (err.message.includes("404")) return null;
                throw err;
            }
        },
        enabled: !!activeHomeId,
        staleTime: 5 * 60 * 1000,
        retry: 1
    })

    // Check if home has any appliances
    const { data: dashboard } = useQuery({
        queryKey: ['home_dashboard', activeHomeId],
        queryFn: () => fetchApi(`/homes/${activeHomeId}/dashboard`),
        enabled: !!activeHomeId,
        staleTime: 5 * 60 * 1000
    })

    // 2. Mutation to trigger AI pipeline
    const pipelineMutation = useMutation({
        mutationFn: async () => {
            return await fetchApi(`/insights/generate`, {
                method: 'POST',
                body: JSON.stringify({ home_id: activeHomeId, target_month: TARGET_MONTH })
            })
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['insights', activeHomeId], data)
        }
    })

    const isGenerating = pipelineMutation.isPending;

    // --- RENDER EMPTY STATE ---
    if (dashboard && !dashboard.has_appliances) {
        return (
            <div className="flex flex-col items-center justify-center py-20 mt-10">
                <BrainCircuit className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-2xl font-medium tracking-tight text-foreground">No Appliances Found</h2>
                <p className="text-muted-foreground mt-2 font-light">AI cannot generate insights for an empty home.</p>
            </div>
        )
    }

    if (!insightsData && !isLoading && !isGenerating) {
        return (
            <motion.div
                initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center justify-center p-12 md:p-20 text-center max-w-2xl mx-auto mt-10 border rounded-[2rem] bg-card border-border/50 shadow-sm overflow-hidden relative"
            >
            {/* SVG Empty State Component */}
            <div className="relative mb-8 z-10 w-48 h-48 flex items-center justify-center">
                {/* Soft background glow */}
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
                <svg width="180" height="180" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-2xl opacity-80">
                    {/* Central AI Core */}
                    <circle cx="120" cy="120" r="40" fill="url(#paint0_radial)" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" className={prefersReducedMotion ? "" : "animate-[spin_10s_linear_infinite]"} />
                    <circle cx="120" cy="120" r="25" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="4" />
                    <circle cx="120" cy="120" r="10" fill="hsl(var(--primary))" className={prefersReducedMotion ? "" : "animate-[pulse_2s_ease-in-out_infinite]"} />

                    {/* Data Nodes */}
                    <path d="M120 40V70" stroke="hsl(var(--secondary))" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="120" cy="30" r="6" fill="hsl(var(--primary))" />

                    <path d="M120 200V170" stroke="hsl(var(--secondary))" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="120" cy="210" r="6" fill="hsl(var(--primary))" />

                    <path d="M40 120H70" stroke="hsl(var(--secondary))" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="30" cy="120" r="6" fill="hsl(var(--primary))" />

                    <path d="M200 120H170" stroke="hsl(var(--secondary))" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="210" cy="120" r="6" fill="hsl(var(--primary))" />

                    {/* Orbital Rings */}
                    <ellipse cx="120" cy="120" rx="80" ry="80" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="10 10" />

                    {/* Sparkles */}
                    <path d="M180 50L185 65L200 70L185 75L180 90L175 75L160 70L175 65Z" fill="hsl(var(--primary))" opacity="0.6" className={prefersReducedMotion ? "" : "animate-[pulse_3s_ease-in-out_infinite]"} />
                    <path d="M60 180L63 190L73 193L63 196L60 206L57 196L47 193L57 190Z" fill="hsl(var(--primary))" opacity="0.4" className={prefersReducedMotion ? "" : "animate-[pulse_4s_ease-in-out_infinite]"} />

                    <defs>
                        <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 120) rotate(90) scale(40)">
                            <stop stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                            <stop offset="1" stopColor="hsl(var(--background))" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                </svg>
            </div>

            <h2 className="text-3xl font-medium tracking-tight text-foreground mb-3 relative z-10">AI Intelligence Standby</h2>
            <p className="text-muted-foreground font-light max-w-md mx-auto text-base leading-relaxed mb-8 relative z-10">
                Connect your appliances and run your first deep-learning energy analysis. We'll identify anomalies and generate a personalized savings plan.
            </p>

            <div className="relative z-10">
                <button
                    onClick={() => pipelineMutation.mutate()}
                    className="bg-primary text-primary-foreground font-medium py-3 px-8 rounded-full transition-all flex items-center hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate AI Report
                </button>
            </div>

            {/* Decorative bottom grid */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:linear-gradient(transparent,white)] opacity-20 pointer-events-none"></div>
        </motion.div>
        )
    }

    // --- RENDER LOADING STATE ---
    if (isLoading || isGenerating) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                    <div className="w-1/3"><Skeleton className="h-10 w-full bg-card" /></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full bg-card rounded-[1.25rem]" />)}
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-[400px] w-full bg-card rounded-[1.5rem]" />
                    </div>
                </div>
                {isGenerating && (
                    <div className="fixed bottom-10 right-10 bg-card border border-border/50 text-foreground px-6 py-4 rounded-xl shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-5">
                        <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                        <div>
                            <p className="font-medium text-sm tracking-tight">AI Pipeline Active</p>
                            <p className="text-xs text-muted-foreground font-light">Analysing usage & forecasting...</p>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // --- RENDER INSIGHTS ---
    const { anomalies, forecast, recommendations, generated_at } = insightsData;
    const dateFormatted = new Date(generated_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 mt-2 gap-4">
                <div>
                    <h1 className="text-3xl font-medium tracking-tight text-foreground flex items-center gap-2">
                        <Sparkles className="h-7 w-7 text-primary opacity-80" />
                        AI Insight Report
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 font-light">
                        Targeting {TARGET_MONTH}
                        <span className="text-muted-foreground/40">•</span>
                        Generated: {dateFormatted}
                    </p>
                </div>

                <button
                    onClick={() => pipelineMutation.mutate()}
                    disabled={isGenerating}
                    className="group border border-border/50 hover:border-primary/50 hover:bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium py-2 px-4 rounded-full flex items-center transition-all disabled:opacity-50 shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    {isGenerating ? 'Regenerating...' : 'Regenerate Pipeline'}
                </button>
            </div>

            {/* Anomalies Banner */}
            {anomalies?.map((a: any, idx: number) => (
                <AnomalyAlert
                    key={idx}
                    month={a.month}
                    expected={a.expected_kwh}
                    actual={a.actual_kwh}
                    deviation_pct={a.deviation_pct}
                    explanation={a.explanation}
                />
            ))}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Insights Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-medium text-foreground mb-4 tracking-tight">Personalized Recommendations</h3>

                    {recommendations?.map((r: any, idx: number) => (
                        <InsightCard
                            key={idx}
                            index={idx}
                            type="recommendation"
                            title={r.appliance_name}
                            description={r.action}
                            impact={r.priority === 1 ? 'HIGH' : r.priority === 2 ? 'MED' : 'LOW'}
                            savings_inr={r.annual_saving_inr}
                            effort={r.effort}
                            reasoning={r.reasoning}
                        />
                    ))}

                    <div className="pt-8">
                        <h3 className="text-lg font-medium text-foreground mb-4 tracking-tight">Behavioural Pattern Analysis</h3>
                        <InsightCard
                            index={3}
                            type="insight"
                            title="Consistent Peak-Hour Spikes"
                            description="Heavy load identified daily between 18:00 - 21:00 affecting thermal stability."
                            impact="MED"
                            reasoning={`Based on time-series analysis, 42% of total heavy appliance usage occurs during the evening peak window. Time-shifting to off-peak (after 22:00) will drastically lower marginal costs for Tier-2 slabs.`}
                        />
                    </div>
                </div>

                {/* Right Col: Forecast (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <ForecastCard
                            amount={forecast.next_month_bill_inr}
                            kwh={forecast.next_month_kwh}
                            confidence={forecast.confidence}
                            low={forecast.range_low}
                            high={forecast.range_high}
                            factors={forecast.key_factors}
                        />
                    </div>
                </div>

            </div>
        </div>
    )
}
