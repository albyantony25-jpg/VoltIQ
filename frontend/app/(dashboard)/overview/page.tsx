"use client";

import { useQuery } from "@tanstack/react-query";
import { useEnergyStore } from "@/stores/useEnergyStore";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Zap, IndianRupee, Leaf, TrendingUp, Plus, BarChart3, Award } from "lucide-react";

/* ─── Skeleton ─── */
function SkeletonCard() {
    return <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 animate-pulse h-28" />;
}

/* ─── Efficiency badge color ─── */
function effColor(score: number) {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
}

/* ─── KPI Card ─── */
function KPI({ icon, label, value, sub, color = 'text-amber-400' }: any) {
    return (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#2a2a2a] transition-colors">
            <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{icon}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-neutral-400 text-xs mt-1">{label}</p>
            {sub && <p className="text-neutral-600 text-xs mt-0.5">{sub}</p>}
        </div>
    );
}

/* ─── Empty dashboard state ─── */
function EmptyDashboard() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            {/* SVG house illustration */}
            <div className="mb-8">
                <svg width="120" height="96" viewBox="0 0 120 96" fill="none">
                    <rect x="20" y="48" width="80" height="48" rx="4" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="2"/>
                    <path d="M10 52L60 8L110 52" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"/>
                    <rect x="48" y="64" width="24" height="32" rx="3" fill="#111" stroke="#2a2a2a" strokeWidth="1.5"/>
                    <rect x="32" y="56" width="16" height="14" rx="2" fill="#1e1e1e" stroke="#2a2a2a"/>
                    <rect x="72" y="56" width="16" height="14" rx="2" fill="#1e1e1e" stroke="#2a2a2a"/>
                    <circle cx="92" cy="20" r="8" fill="#F59E0B" opacity="0.15"/>
                    <path d="M92 16v4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M92 16L92 20" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="92" cy="20" r="2" fill="#F59E0B"/>
                </svg>
            </div>

            <h2 className="text-3xl font-black text-white mb-3">Your dashboard is ready!</h2>
            <p className="text-neutral-500 mb-10 max-w-sm">
                Now add your home appliances to see your energy analysis, bill prediction, and AI insights.
            </p>

            {/* Locked preview cards */}
            <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg">
                {[
                    { icon: '📊', label: 'Bill Estimate' },
                    { icon: '🏆', label: 'Efficiency Score' },
                    { icon: '🌱', label: 'CO₂ Footprint' },
                ].map((c, i) => (
                    <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 relative overflow-hidden">
                        <div className="text-2xl mb-2">{c.icon}</div>
                        <div className="text-2xl font-black text-neutral-700 blur-sm select-none">₹??</div>
                        <p className="text-xs text-neutral-600 mt-1">{c.label}</p>
                        <div className="absolute inset-0 bg-[#080808]/60 flex items-center justify-center">
                            <span className="text-xs text-neutral-500 font-medium">🔒 Unlocks after adding appliances</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pulsing CTA */}
            <Link href="/appliances"
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-base transition-all hover:scale-105 shadow-2xl shadow-amber-500/30 animate-pulse">
                <Plus className="w-5 h-5" />
                Add Your Appliances
            </Link>
            <p className="text-neutral-600 text-sm mt-4">Takes only 2 minutes</p>
        </div>
    );
}

/* ─── Full dashboard ─── */
function FullDashboard({ data }: { data: any }) {
    const summary = data.summary || {};
    const byCategoryMap = summary.by_category || {};
    const topConsumers: any[] = summary.top_consumers || [];

    const byCategory = Object.entries(byCategoryMap).map(([cat, kwh]: [string, any]) => ({
        category: cat,
        kwh: kwh,
        pct: summary.total_monthly_kwh > 0 ? (kwh / summary.total_monthly_kwh) * 100 : 0
    }));

    const totalKwh = summary.total_monthly_kwh || 0;
    const projectedBill = data.projected_bill || 0;
    const homeScore = data.home_score || 0;
    const co2Kg = totalKwh * 0.82; // Mock intensity

    const CAT_COLORS: Record<string, string> = {
        hvac: '#3b82f6', kitchen: '#f59e0b', entertainment: '#a855f7',
        lighting: '#eab308', ev: '#10b981', laundry: '#ec4899', other: '#64748b'
    };

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI icon="⚡" label="Monthly Consumption" value={`${totalKwh.toFixed(0)} kWh`} color="text-amber-400" />
                <KPI icon="₹" label="Estimated Bill" value={`₹${projectedBill.toFixed(0)}`} sub="This month" color="text-emerald-400" />
                <KPI icon="🏆" label="Efficiency Score" value={`${homeScore}/100`} color={effColor(homeScore)} />
                <KPI icon="🌱" label="CO₂ Footprint" value={`${co2Kg.toFixed(1)} kg`} sub="This month" color="text-teal-400" />
            </div>

            {/* Two columns: Category breakdown + Top consumers */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* Category breakdown */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" /> By Category</h3>
                    <div className="space-y-3">
                        {byCategory.sort((a, b) => b.kwh - a.kwh).slice(0, 6).map((c: any) => (
                            <div key={c.category}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm text-neutral-300 capitalize">{c.category}</span>
                                    <span className="text-sm font-semibold text-white">{(c.kwh || 0).toFixed(1)} kWh</span>
                                </div>
                                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${c.pct || 0}%`, backgroundColor: CAT_COLORS[c.category] || '#666' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top consumers */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Top Consumers</h3>
                    <div className="space-y-3">
                        {topConsumers.slice(0, 5).map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-neutral-600 text-sm w-5">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-neutral-200 truncate">{c.brand ? `${c.brand} ${c.name}` : c.name}</p>
                                    <div className="h-1 bg-[#1a1a1a] rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${c.pct || 0}%` }} />
                                    </div>
                                </div>
                                <span className="text-xs text-amber-400 font-mono shrink-0">₹{(c.cost_inr || 0).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                    <Link href="/appliances" className="mt-4 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                        Manage appliances <Plus className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* Score + CO2 row */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col items-center justify-center">
                    <Award className="w-8 h-8 text-amber-400 mb-2" />
                    <p className={`text-5xl font-black mb-1 ${effColor(homeScore)}`}>{homeScore}</p>
                    <p className="text-neutral-500 text-sm">Efficiency Score</p>
                    <p className="text-xs text-neutral-600 mt-1">out of 100</p>
                </div>
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 lg:col-span-2">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Sustainability</h3>
                    <div className="flex items-end gap-4">
                        <div>
                            <p className="text-4xl font-black text-teal-400">{co2Kg.toFixed(0)} kg</p>
                            <p className="text-neutral-500 text-sm mt-1">CO₂ equivalent this month</p>
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-2xl font-bold text-neutral-300">{Math.min(100, homeScore + 10)}<span className="text-sm text-neutral-500">/100</span></p>
                            <p className="text-xs text-neutral-600">Sustainability score</p>
                        </div>
                    </div>
                    <Link href="/billing" className="mt-4 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                        See full bill breakdown <IndianRupee className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ─── Page ─── */
export default function OverviewPage() {
    const { activeHomeId, activeHome } = useEnergyStore();

    const { data, isLoading, error } = useQuery({
        queryKey: ['home_dashboard', activeHomeId],
        queryFn: () => fetchApi(`/homes/${activeHomeId}/dashboard`),
        enabled: !!activeHomeId,
        staleTime: 2 * 60 * 1000,
        retry: 1,
    });

    if (!activeHomeId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Zap className="w-12 h-12 text-neutral-700 mb-4" />
                <h2 className="text-xl font-bold text-neutral-300 mb-2">No home configured</h2>
                <Link href="/setup" className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-all">
                    Set Up Your Home
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                    <SkeletonCard /><SkeletonCard />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-20 text-neutral-500">
                <p>Could not load dashboard. Please try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-black text-white">{activeHome?.name || 'My Home'}</h1>
                <p className="text-neutral-500 text-sm">{activeHome?.city || ''} • Energy Dashboard</p>
            </div>
            {data.has_appliances === false ? <EmptyDashboard /> : <FullDashboard data={data} />}
        </div>
    );
}
