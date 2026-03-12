"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useEnergyStore } from "@/stores/useEnergyStore";
import Link from "next/link";
import { Zap, TrendingUp, BarChart3, PieChart } from "lucide-react";

/* ─── Color maps ─── */
const EFF_COLORS: Record<string, string> = {
    'A+++': '#10b981', 'A++': '#14b8a6', 'A+': '#3b82f6',
    'A': '#f59e0b', 'B': '#f97316', 'C': '#ef4444', 'D': '#dc2626',
};
const CAT_COLORS: Record<string, string> = {
    hvac: '#3b82f6', kitchen: '#f59e0b', entertainment: '#a855f7',
    lighting: '#eab308', ev: '#10b981', laundry: '#ec4899', other: '#64748b',
};

/* ─── Skeleton ─── */
function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-[#1a1a1a] animate-pulse rounded-xl ${className}`} />;
}

/* ─── KPI Card ─── */
function KPI({ icon, label, value, sub, color = 'text-amber-400' }: any) {
    return (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <div className="text-2xl mb-3">{icon}</div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-neutral-400 text-xs mt-1">{label}</p>
            {sub && <p className="text-neutral-600 text-xs mt-0.5">{sub}</p>}
        </div>
    );
}

/* ─── Simple SVG Donut ─── */
function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <div className="text-center text-neutral-600 py-8">No data</div>;
    let cumulative = 0;
    const cx = 80, cy = 80, r = 60, strokeW = 20;
    const circ = 2 * Math.PI * r;
    return (
        <svg viewBox="0 0 160 160" className="w-full max-w-xs mx-auto">
            {data.map((d, i) => {
                const pct = d.value / total;
                const dash = pct * circ;
                const offset = cumulative * circ;
                cumulative += pct;
                return (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={d.color} strokeWidth={strokeW}
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={circ / 4 - offset}
                        className="transition-all duration-700" />
                );
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#f5f5f5" fontSize="14" fontWeight="bold">Total</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#737373" fontSize="10">breakdown</text>
        </svg>
    );
}

/* ─── Page ─── */
export default function BillingPage() {
    const { activeHomeId } = useEnergyStore();
    const [showOptimize, setShowOptimize] = useState<string | null>(null);

    /* Fetch billing breakdown */
    const { data: billing, isLoading, error } = useQuery({
        queryKey: ['billing_breakdown', activeHomeId],
        queryFn: () => fetchApi(`/billing/${activeHomeId}/breakdown`),
        enabled: !!activeHomeId,
        staleTime: 5 * 60 * 1000,
    });

    /* Also check dashboard for has_appliances */
    const { data: dashboard } = useQuery({
        queryKey: ['home_dashboard', activeHomeId],
        queryFn: () => fetchApi(`/homes/${activeHomeId}/dashboard`),
        enabled: !!activeHomeId,
        staleTime: 5 * 60 * 1000,
    });

    if (!activeHomeId) {
        return (
            <div className="text-center py-20">
                <Zap className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-neutral-300 mb-2">No home configured</h2>
                <Link href="/setup" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm">Setup Home</Link>
            </div>
        );
    }

    if (!dashboard?.has_appliances) {
        return (
            <div className="text-center py-20">
                <BarChart3 className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-neutral-300 mb-2">No appliances yet</h2>
                <p className="text-neutral-600 mb-6">Add appliances to see your billing breakdown.</p>
                <Link href="/appliances" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm">Add Appliances</Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0,1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
                </div>
                <Skeleton className="h-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (error || !billing) {
        return <div className="text-center py-20 text-neutral-500">Failed to load billing data.</div>;
    }

    const perAppliance: any[] = billing.per_appliance || [];
    const perCategory: any[] = billing.per_category || [];
    const slabBreakdown: any[] = billing.slab_breakdown || [];
    const billComponents = billing.bill_components || {};
    const totalBill = billing.total_bill_inr || 0;
    const totalKwh = billing.total_kwh || 0;
    const avgDay = totalBill / 30;

    /* Donut data */
    const donutByAppliance = perAppliance.slice(0, 6).map((a: any) => ({
        label: `${a.brand || ''} ${a.name}`.trim(),
        value: a.cost_inr || 0,
        color: EFF_COLORS[a.efficiency_class] || '#64748b',
    }));
    const donutByCategory = perCategory.map((c: any) => ({
        label: c.category,
        value: c.cost_inr || 0,
        color: CAT_COLORS[c.category] || '#64748b',
    }));

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-white">Billing Breakdown</h1>
                <p className="text-neutral-500 text-sm">Your energy costs analyzed in detail</p>
            </div>

            {/* ─── Part 1: KPIs ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI icon="⚡" label="Monthly Consumption" value={`${totalKwh.toFixed(0)} kWh`} color="text-amber-400" />
                <KPI icon="₹" label="Estimated Bill" value={`₹${totalBill.toFixed(0)}`} sub="This month" color="text-emerald-400" />
                <KPI icon="📅" label="Average per Day" value={`₹${avgDay.toFixed(0)}`} color="text-blue-400" />
                <KPI icon="📊" label="Slab Tiers Used" value={`${slabBreakdown.length}`} sub="tariff slabs" color="text-purple-400" />
            </div>

            {/* ─── Bill Components ─── */}
            {Object.keys(billComponents).length > 0 && (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" /> Bill Components</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(billComponents).map(([key, val]: any) => (
                            <div key={key} className="bg-[#0a0a0a] rounded-xl p-3">
                                <p className="text-xs text-neutral-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                                <p className="text-lg font-bold text-white">₹{(val || 0).toFixed(0)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Slab Breakdown ─── */}
            {slabBreakdown.length > 0 && (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4">Slab-wise Consumption</h3>
                    <div className="space-y-3">
                        {slabBreakdown.map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-xs text-neutral-500 w-28 shrink-0">{s.slab || `Slab ${i+1}`}</span>
                                <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (s.units / totalKwh) * 100)}%` }} />
                                </div>
                                <span className="text-xs text-neutral-300 w-16 text-right font-mono">{(s.units || 0).toFixed(0)} kWh</span>
                                <span className="text-xs text-amber-400 w-20 text-right font-mono">₹{(s.charge || 0).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Part 2: Per-appliance table ─── */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Cost by Appliance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e1e]">
                                {['#', 'Appliance', 'Category', 'kWh/mo', 'Cost', '% of Bill', 'Class'].map(h => (
                                    <th key={h} className="text-left text-xs text-neutral-500 font-medium pb-3 pr-4">{h}</th>
                                ))}
                                <th className="text-left text-xs text-neutral-500 font-medium pb-3">Optimize</th>
                            </tr>
                        </thead>
                        <tbody>
                            {perAppliance.sort((a, b) => b.cost_inr - a.cost_inr).map((a: any, i: number) => {
                                const barColor = EFF_COLORS[a.efficiency_class] || '#64748b';
                                const saving1hr = (a.cost_inr / (a.monthly_kwh / 30 * 24)) / 30;
                                return (
                                    <React.Fragment key={a.appliance_id || i}>
                                        <tr className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 pr-4 text-neutral-600">{i + 1}</td>
                                            <td className="py-3 pr-4 font-medium text-white max-w-48">
                                                <p className="truncate">{[a.brand, a.name].filter(Boolean).join(' ')}</p>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className="text-xs capitalize px-2 py-0.5 rounded-full border" style={{ color: CAT_COLORS[a.category] || '#666', borderColor: `${CAT_COLORS[a.category]}33` }}>
                                                    {a.category}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 font-mono text-neutral-300">{(a.monthly_kwh || 0).toFixed(1)}</td>
                                            <td className="py-3 pr-4">
                                                <div>
                                                    <span className="font-bold text-white">₹{(a.cost_inr || 0).toFixed(0)}</span>
                                                    <div className="h-1 mt-1 bg-[#1a1a1a] rounded-full overflow-hidden w-24">
                                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${a.pct_of_total || 0}%`, backgroundColor: barColor }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-neutral-400">{(a.pct_of_total || 0).toFixed(1)}%</td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded border`} style={{
                                                    backgroundColor: `${barColor}20`, color: barColor, borderColor: `${barColor}40`
                                                }}>
                                                    {a.efficiency_class || 'A'}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <button onClick={() => setShowOptimize(showOptimize === a.appliance_id ? null : a.appliance_id)}
                                                    className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/20 px-2 py-1 rounded transition-colors">
                                                    Optimize
                                                </button>
                                            </td>
                                        </tr>
                                        {showOptimize === a.appliance_id && (
                                            <tr>
                                                <td colSpan={8} className="pb-3 pt-0">
                                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-300">
                                                        💡 Reducing <strong>{a.name}</strong> usage by 1 hr/day saves <strong>₹{saving1hr > 0 ? saving1hr.toFixed(0) : '~30'}/month</strong> (₹{saving1hr > 0 ? (saving1hr * 12).toFixed(0) : '360'}/year)
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Pie charts row ─── */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* By appliance */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-amber-400" /> By Appliance</h3>
                    <Donut data={donutByAppliance} />
                    <div className="mt-4 space-y-1.5">
                        {donutByAppliance.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="text-xs text-neutral-400 truncate flex-1">{d.label}</span>
                                <span className="text-xs text-neutral-300 font-mono">₹{d.value.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By category */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-amber-400" /> By Category</h3>
                    <Donut data={donutByCategory} />
                    <div className="mt-4 space-y-1.5">
                        {donutByCategory.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="text-xs text-neutral-400 capitalize flex-1">{d.label}</span>
                                <span className="text-xs text-neutral-300 font-mono">₹{d.value.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
