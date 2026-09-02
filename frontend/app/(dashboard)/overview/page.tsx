"use client";

import { useQuery } from "@tanstack/react-query";
import { useEnergyStore } from "@/stores/useEnergyStore";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Zap, IndianRupee, Leaf, TrendingUp, Plus, BarChart3, Award, ShieldCheck, TreePine, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { LiveGauge } from "@/components/shared/LiveGauge";

/* ─── Skeleton ─── */
function SkeletonCard() {
    return <div className="border border-border rounded-xl p-5 animate-pulse h-28 bg-muted/20" />;
}

/* ─── Efficiency badge color ─── */
function effColor(score: number) {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-foreground';
    return 'text-destructive';
}

/* ─── KPI Component ─── */
function KPI({ icon, label, value, sub, color = 'text-foreground' }: any) {
    return (
        <div className="flex flex-col justify-center p-5 md:border-l border-border first:border-0 relative hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <span className="opacity-70">{icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-medium tracking-tight tabular-nums ${color}`}>{value}</p>
                {sub && <span className="text-muted-foreground text-xs font-medium">{sub}</span>}
            </div>
        </div>
    );
}

/* ─── Empty dashboard state ─── */
function EmptyDashboard() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="mb-6 opacity-40">
                <Zap className="w-16 h-16 text-foreground" strokeWidth={1} />
            </div>
            <h2 className="text-3xl font-medium tracking-tight text-foreground mb-3">Your dashboard is ready.</h2>
            <p className="text-muted-foreground mb-10 max-w-sm font-light">
                Add your home appliances to see your energy analysis, bill prediction, and AI insights.
            </p>

            {/* Locked preview metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full max-w-2xl">
                {[
                    { icon: <IndianRupee className="w-5 h-5" />, label: 'Bill Estimate' },
                    { icon: <ShieldCheck className="w-5 h-5" />, label: 'Efficiency Score' },
                    { icon: <TreePine className="w-5 h-5" />, label: 'CO₂ Footprint' },
                ].map((c, i) => (
                    <div key={i} className="flex flex-col items-center p-6 border border-border rounded-xl bg-card relative overflow-hidden group">
                        <div className="text-muted-foreground mb-4 opacity-50">{c.icon}</div>
                        <div className="text-2xl font-medium tracking-tight text-foreground blur-sm select-none tabular-nums mb-1">₹??</div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border/50">
                                <AlertCircle className="w-3 h-3" /> Locked
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <Link href="/appliances"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background font-medium rounded-full text-sm transition-all hover:opacity-90">
                <Plus className="w-4 h-4" />
                Add Appliances
            </Link>
            <p className="text-muted-foreground text-xs mt-4 font-light">Takes only 2 minutes</p>
        </div>
    );
}

/* ─── Live Simulations ─── */
const LivePowerMeter = ({ appliances }: { appliances: any[] }) => {
  const baseWatts = appliances.reduce((sum, a) => sum + (a.rated_watts * (a.load_factor || 0.85)), 0) / 1000
  const [current, setCurrent] = useState(baseWatts)

  useEffect(() => {
    const interval = setInterval(() => {
      const noise = (Math.random() - 0.5) * 0.3
      setCurrent(prev => Math.max(0.1, +(prev + noise).toFixed(2)))
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  const max = Math.max(baseWatts * 2, 5)

  return (
    <div className="flex flex-col items-center justify-between border border-border rounded-xl bg-card p-6 w-full sm:w-[40%] lg:w-1/3 min-h-[240px]">
      <div className="flex w-full justify-between items-start mb-6">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Live Draw</p>
      </div>
      
      <div className="w-full flex-1 flex items-center justify-center relative">
        <LiveGauge 
          value={current}
          max={max}
          unit="kW"
          status={
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-accent/20 bg-accent/10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_hsl(var(--accent))]"/>
              <span className="text-[10px] font-bold tracking-widest text-accent">LIVE</span>
            </div>
          }
        />
      </div>
    </div>
  )
}

const LiveHourlyChart = ({ appliances }: { appliances: any[] }) => {
  const totalKw = appliances.reduce((sum, a) => sum + (a.rated_watts * (a.load_factor || 0.85)), 0) / 1000

  const generateHourlyData = () => {
    const currentHour = new Date().getHours()
    const usagePattern = [0.3,0.2,0.2,0.2,0.3,0.5,0.8,1.0,0.9,0.8,0.7,0.8,0.9,0.8,0.7,0.7,0.8,1.0,1.1,1.0,0.9,0.8,0.6,0.4]
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      kw: i <= currentHour ? +(totalKw * usagePattern[i] * (0.9 + Math.random() * 0.2)).toFixed(2) : null
    }))
  }

  const [data, setData] = useState(generateHourlyData())

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const currentHour = new Date().getHours()
        const newArray = [...prev]
        const currentKw = newArray[currentHour]?.kw
        if (currentKw !== null && currentKw !== undefined) {
           newArray[currentHour] = { ...newArray[currentHour], kw: +(currentKw + (Math.random() - 0.5) * 0.1).toFixed(2) }
        }
        return newArray
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const hasOnePoint = data.filter(d => d.kw !== null).length === 1;

  return (
    <div className="flex-1 border border-border rounded-xl bg-card p-6 min-w-0 min-h-[240px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Today's Usage</p>
      </div>
      <div className="flex-1 -ml-4 min-h-0 relative">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="kwGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<ChartTooltip unit="kW" />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" name="Power Draw" dataKey="kw" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#kwGradient)" dot={hasOnePoint ? { r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 } : false} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ─── Full dashboard ─── */
function FullDashboard({ data, appliances }: { data: any, appliances: any[] }) {
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

    return (
        <div className="space-y-12 mt-8">
            
            {/* KPI Container (Whitespace & Typography focus, NOT cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-border rounded-xl bg-card overflow-hidden divide-y md:divide-y-0">
                <KPI icon={<Zap className="w-5 h-5" />} label="Monthly Consumption" value={`${totalKwh.toFixed(0)} kWh`} />
                <KPI icon={<IndianRupee className="w-5 h-5" />} label="Estimated Bill" value={`₹${projectedBill.toFixed(0)}`} sub="Projected total" />
                <KPI icon={<ShieldCheck className="w-5 h-5" />} label="Efficiency Score" value={`${homeScore}/100`} color={effColor(homeScore)} />
                <KPI icon={<TreePine className="w-5 h-5" />} label="CO₂ Footprint" value={`${co2Kg.toFixed(1)} kg`} sub="This month" />
            </div>

            {/* LIVE SIMULATION WIDGETS */}
            {appliances && appliances.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-6">
                <LivePowerMeter appliances={appliances} />
                <LiveHourlyChart appliances={appliances} />
              </div>
            )}

            {/* Two columns: Category breakdown + Top consumers using sections instead of heavy cards */}
            <div className="grid lg:grid-cols-2 gap-12 pt-6">
                
                {/* Category breakdown */}
                <div>
                    <h3 className="font-semibold tracking-tight text-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                        <BarChart3 className="w-4 h-4 text-muted-foreground" /> By Category
                    </h3>
                    <div className="space-y-5">
                        {byCategory.sort((a, b) => b.kwh - a.kwh).slice(0, 6).map((c: any) => (
                            <div key={c.category}>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-muted-foreground capitalize">{c.category}</span>
                                    <span className="text-sm font-medium text-foreground tabular-nums">{(c.kwh || 0).toFixed(1)} kWh</span>
                                </div>
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-foreground rounded-full transition-all duration-1000"
                                        style={{ width: `${c.pct || 0}%`, opacity: Math.max(0.3, (c.pct / 100) + 0.1) }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top consumers */}
                <div>
                    <h3 className="font-semibold tracking-tight text-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                        <Zap className="w-4 h-4 text-muted-foreground" /> Top Consumers
                    </h3>
                    <div className="space-y-1">
                        {topConsumers.slice(0, 5).map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 py-3 group border-b border-border/50 last:border-0">
                                <span className="text-muted-foreground text-sm font-mono w-4">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{c.brand ? `${c.brand} ${c.name}` : c.name}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-accent rounded-full" style={{ width: `${c.pct || 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right pl-4">
                                    <span className="text-sm font-medium text-foreground font-mono tabular-nums">₹{(c.cost_inr || 0).toFixed(0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <Link href="/appliances" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors font-medium w-fit">
                            Manage appliances <Plus className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Score + CO2 row */}
            <div className="grid lg:grid-cols-3 gap-6 mt-12 border-t border-border pt-12">
                <div className="flex flex-col items-start justify-center">
                    <p className="text-muted-foreground text-sm font-semibold tracking-wider uppercase mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 opacity-70" /> Efficiency Score
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-6xl font-medium tracking-tighter tabular-nums ${effColor(homeScore)}`}>{homeScore}</p>
                        <p className="text-muted-foreground text-sm">/ 100</p>
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col justify-center border-l border-border pl-6">
                    <p className="text-muted-foreground text-sm font-semibold tracking-wider uppercase mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 opacity-70" /> Sustainability Impact
                    </p>
                    <div className="flex flex-wrap items-end gap-6 justify-between">
                        <div>
                            <p className="text-4xl font-medium tracking-tighter text-foreground tabular-nums">
                                {co2Kg.toFixed(0)} <span className="text-xl text-muted-foreground font-normal">kg</span>
                            </p>
                            <p className="text-muted-foreground text-sm mt-1 font-medium">CO₂ equivalent this month</p>
                        </div>
                        <Link href="/billing" className="text-sm text-foreground hover:text-accent flex items-center gap-2 transition-colors font-medium border border-border px-4 py-2 rounded-full hover:border-accent/50 bg-card">
                            View Bill Breakdown <IndianRupee className="w-3 h-3" />
                        </Link>
                    </div>
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

    const { data: appliances = [] } = useQuery({
        queryKey: ['my_appliances', activeHomeId],
        queryFn: () => fetchApi(`/appliances/?home_id=${activeHomeId}`),
        enabled: !!activeHomeId,
        staleTime: 2 * 60 * 1000,
    });

    if (!activeHomeId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Zap className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-2xl font-medium tracking-tight text-foreground mb-2">No home configured</h2>
                <Link href="/setup" className="mt-4 px-6 py-2.5 bg-foreground hover:opacity-90 text-background font-medium rounded-full text-sm transition-all">
                    Set Up Your Home
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-12 mt-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                    <SkeletonCard /><SkeletonCard />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <p>Could not load dashboard. Please try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Page header */}
            <div className="flex flex-col items-start gap-1 pb-4 border-b border-border">
                <h1 className="text-3xl font-medium tracking-tight text-foreground">{activeHome?.name || 'My Home'}</h1>
                <p className="text-muted-foreground text-sm font-medium">{activeHome?.city || ''}</p>
            </div>
            {data.has_appliances === false ? <EmptyDashboard /> : <FullDashboard data={data} appliances={appliances} />}
        </div>
    );
}
