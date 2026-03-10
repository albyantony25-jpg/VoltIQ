"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center mb-8 mt-2">
                <div>
                    <div className="h-8 w-64 bg-slate-800 rounded-md"></div>
                    <div className="h-4 w-96 bg-slate-800 rounded-md mt-2"></div>
                </div>
            </div>

            {/* ROW 1: KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[160px]">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="relative overflow-hidden border border-slate-800 bg-slate-900/50 rounded-xl p-6 h-full flex flex-col justify-between group">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/20 to-transparent"></div>
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-4 w-24 bg-slate-800" />
                            <Skeleton className="h-8 w-8 rounded-lg bg-slate-800" />
                        </div>
                        <div className="space-y-2 mt-4">
                            <Skeleton className="h-8 w-32 bg-slate-800" />
                            <Skeleton className="h-4 w-20 bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>

            {/* ROW 2: Consumption Trend & Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[400px]">
                <div className="lg:col-span-3 h-full relative overflow-hidden border border-slate-800 bg-slate-900/50 rounded-xl p-6">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/10 to-transparent"></div>
                    <div className="space-y-4 h-full flex flex-col">
                        <Skeleton className="h-6 w-48 bg-slate-800" />
                        <Skeleton className="h-4 w-64 bg-slate-800" />
                        <Skeleton className="flex-1 w-full bg-slate-800 rounded-lg mt-4" />
                    </div>
                </div>
                <div className="lg:col-span-2 h-full relative overflow-hidden border border-slate-800 bg-slate-900/50 rounded-xl p-6 flex flex-col items-center justify-center">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/10 to-transparent"></div>
                    <Skeleton className="h-6 w-48 bg-slate-800 self-start mb-12" />
                    <Skeleton className="h-40 w-40 rounded-full bg-slate-800 mb-8" />
                    <div className="w-full flex justify-between gap-4 mt-auto">
                        <Skeleton className="h-16 flex-1 bg-slate-800 rounded-lg" />
                        <Skeleton className="h-16 flex-1 bg-slate-800 rounded-lg" />
                        <Skeleton className="h-16 flex-1 bg-slate-800 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* ROW 3: Category Breakdown & Top Consumers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[380px]">
                <div className="h-full relative overflow-hidden border border-slate-800 bg-slate-900/50 rounded-xl p-6">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/10 to-transparent"></div>
                    <Skeleton className="h-6 w-40 bg-slate-800 mb-8" />
                    <div className="flex items-center gap-8 h-full">
                        <Skeleton className="h-40 w-40 rounded-full bg-slate-800" />
                        <div className="flex-1 space-y-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-slate-800" />)}
                        </div>
                    </div>
                </div>
                <div className="h-full relative overflow-hidden border border-slate-800 bg-slate-900/50 rounded-xl p-6">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-800/10 to-transparent"></div>
                    <Skeleton className="h-6 w-40 bg-slate-800 mb-6" />
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-12 w-12 rounded-lg bg-slate-800" />
                                <div className="flex-1 space-y-2 py-1">
                                    <Skeleton className="h-4 w-3/4 bg-slate-800" />
                                    <Skeleton className="h-3 w-1/2 bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
