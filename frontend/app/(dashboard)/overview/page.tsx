"use client";

import { useQuery } from "@tanstack/react-query";
import { useEnergyStore } from "@/stores/useEnergyStore";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Zap, IndianRupee, Leaf, TrendingUp, Plus, BarChart3, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ─── Skeleton ─── */
function SkeletonCard() {
    return <div className="bg-card border border-border/50 rounded-[1.25rem] p-5 animate-pulse h-28" />;
}

/* ─── Efficiency badge color ─── */
function effColor(score: number) {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-muted-foreground';
    return 'text-destructive';
}

/* ─── KPI Card ─── */
function KPI({ icon, label, value, sub, color = 'text-primary' }: any) {
    return (
        <div className="bg-card border border-border/50 rounded-[1.25rem] p-5 hover:border-primary/20 transition-all duration-300 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <span className="text-2xl opacity-80">{icon}</span>
            </div>
            <p className={`text-2xl font-medium tracking-tight ${color}`}>{value}</p>
            <p className="text-muted-foreground text-xs mt-1 font-light">{label}</p>
            {sub && <p className="text-muted-foreground/60 text-xs mt-0.5 font-light">{sub}</p>}
        </div>
    );
}

/* ─── Empty dashboard state ─── */
function EmptyDashboard() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            {/* SVG house illustration */}
            <div className="mb-8 opacity-60">
                <svg width="120" height="96" viewBox="0 0 120 96" fill="none">
                    <rect x="20" y="48" width="80" height="48" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2"/>
                    <path d="M10 52L60 8L110 52" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="48" y="64" width="24" height="32" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5"/>
                    <rect x="32" y="56" width="16" height="14" rx="2" fill="hsl(var(--secondary))" stroke="hsl(var(--border))"/>
                    <rect x="72" y="56" width="16" height="14" rx="2" fill="hsl(var(--secondary))" stroke="hsl(var(--border))"/>
                </svg>
            </div>

            <h2 className="text-3xl font-medium tracking-tight text-foreground mb-3">Your dashboard is ready.</h2>
            <p className="text-muted-foreground mb-10 max-w-sm font-light">
                Now add your home appliances to see your energy analysis, bill prediction, and AI insights.
            </p>

            {/* Locked preview cards */}
            <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg">
                {[
                    { icon: '⌘', label: 'Bill Estimate' },
                    { icon: '✨', label: 'Efficiency Score' },
                    { icon: '🌍', label: 'CO₂ Footprint' },
                ].map((c, i) => (
                    <div key={i} className="bg-card border border-border/50 rounded-[1.25rem] p-4 relative overflow-hidden">
                        <div className="text-2xl mb-2 opacity-50">{c.icon}</div>
                        <div className="text-2xl font-medium tracking-tight text-foreground blur-sm select-none">₹??</div>
                        <p className="text-xs text-muted-foreground mt-1 font-light">{c.label}</p>
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-xs text-muted-foreground font-medium">🔒 Locked</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pulsing CTA */}
            <Link href="/appliances"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm transition-all hover:scale-105">
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
  const pct = Math.min(current / max, 1)
  const angle = -210 + pct * 240
  // Sleek monochrome colors
  const color = '#ffffff'
  const bgColor = '#ffffff10'

  // SVG semicolon arc perfectly adjusted for 260x170 viewBox
  const r = 105, cx = 130, cy = 115
  const startAngle = -210, endAngle = 30
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcX1 = cx + r * Math.cos(toRad(startAngle))
  const arcY1 = cy + r * Math.sin(toRad(startAngle))
  const arcX2 = cx + r * Math.cos(toRad(endAngle))
  const arcY2 = cy + r * Math.sin(toRad(endAngle))

  return (
    <div className="flex flex-col items-center justify-between bg-card border border-border/50 rounded-[1.5rem] p-6 w-full lg:w-1/3 min-h-[240px]">
      <div className="flex w-full justify-between items-start mb-2">
        <p className="text-muted-foreground text-xs font-medium">Live Power Draw</p>
        <div className="flex items-center gap-1.5 opacity-90 px-2 py-0.5 rounded-full border border-border bg-secondary/50 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: color, color }}/>
          <span className="text-[10px] font-medium tracking-wide text-foreground">LIVE</span>
        </div>
      </div>
      
      <div className="w-full flex-1 flex items-center justify-center relative">
        <svg viewBox="0 0 260 180" className="w-full max-w-[260px] overflow-visible">
          <defs>
            <filter id="glowArc" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background arc */}
          <path d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${arcX2} ${arcY2}`}
            fill="none" stroke={bgColor} strokeWidth="12" strokeLinecap="round"/>
          
          {/* Inner ticks for premium speedometer look */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const tickAngle = startAngle + t * 240
            const x1 = cx + (r - 18) * Math.cos(toRad(tickAngle))
            const y1 = cy + (r - 18) * Math.sin(toRad(tickAngle))
            const x2 = cx + (r - 24) * Math.cos(toRad(tickAngle))
            const y2 = cy + (r - 24) * Math.sin(toRad(tickAngle))
            const val = (max * t).toFixed(1)
            const textX = cx + (r - 38) * Math.cos(toRad(tickAngle))
            const textY = cy + (r - 38) * Math.sin(toRad(tickAngle))
            return (
              <g key={t}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff20" strokeWidth="1.5" strokeLinecap="round"/>
                <text x={textX} y={textY} fill="#8E8E93" fontSize="10" textAnchor="middle" dominantBaseline="middle" fontWeight="400" letterSpacing="-0.5">
                  {val}
                </text>
              </g>
            )
          })}
          
          {/* Active arc */}
          <path d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${arcX2} ${arcY2}`}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" filter="url(#glowArc)" 
            style={{
              strokeDasharray: 440,
              strokeDashoffset: 440 * (1 - Math.max(0.01, pct)),
              transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1), stroke 500ms ease'
            }}/>
          
          {/* Centered Value text */}
          <text x={cx} y={cy + 18} textAnchor="middle" fill="currentColor" fontSize="42" fontWeight="500" className="tracking-tighter">
            {current.toFixed(1)} <tspan fontSize="18" fill="#8E8E93" fontWeight="400" dy="-6">kW</tspan>
          </text>
        </svg>
      </div>
    </div>
  )
}

const LiveHourlyChart = ({ appliances }: { appliances: any[] }) => {
  const totalKw = appliances.reduce((sum, a) => sum + (a.rated_watts * (a.load_factor || 0.85)), 0) / 1000

  const generateHourlyData = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const usagePattern = [0.3,0.2,0.2,0.2,0.3,0.5,0.8,1.0,0.9,0.8,0.7,0.8,0.9,0.8,0.7,0.7,0.8,1.0,1.1,1.0,0.9,0.8,0.6,0.4]
    return Array.from({ length: currentHour + 1 }, (_, i) => ({
      hour: `${i}:00`,
      kw: +(totalKw * usagePattern[i] * (0.9 + Math.random() * 0.2)).toFixed(2)
    }))
  }

  const [data, setData] = useState(generateHourlyData())

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, kw: +(last.kw + (Math.random() - 0.5) * 0.1).toFixed(2) }]
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex-1 bg-card border border-border/50 rounded-[1.5rem] p-6 min-w-0 min-h-[240px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-xs font-medium">Today's Usage</p>
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full border border-border bg-secondary/50 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_currentColor]"/>
          <span className="text-[10px] font-medium tracking-wide text-foreground">LIVE</span>
        </div>
      </div>
      <div className="flex-1 -ml-4 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="kwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tick={{ fill: '#8E8E93', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
            <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} tickLine={false} axisLine={false} width={35} unit="kW"/>
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} labelStyle={{ color: '#8E8E93', marginBottom: 4 }} itemStyle={{ color: '#fff', fontWeight: 500 }}/>
            <Area type="monotone" dataKey="kw" stroke="#ffffff" strokeWidth={2} fill="url(#kwGradient)" dot={false} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
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

    const CAT_COLORS: Record<string, string> = {
        hvac: '#3b82f6', kitchen: '#f59e0b', entertainment: '#a855f7',
        lighting: '#eab308', ev: '#10b981', laundry: '#ec4899', other: '#64748b'
    };

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI icon="⚡" label="Monthly Consumption" value={`${totalKwh.toFixed(0)} kWh`} />
                <KPI icon="₹" label="Estimated Bill" value={`₹${projectedBill.toFixed(0)}`} sub="This month" color="text-foreground" />
                <KPI icon="🏆" label="Efficiency Score" value={`${homeScore}/100`} color={effColor(homeScore)} />
                <KPI icon="🌍" label="CO₂ Footprint" value={`${co2Kg.toFixed(1)} kg`} sub="This month" color="text-muted-foreground" />
            </div>

            {/* LIVE SIMULATION WIDGETS */}
            {appliances && appliances.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4">
                <LivePowerMeter appliances={appliances} />
                <LiveHourlyChart appliances={appliances} />
              </div>
            )}

            {/* Two columns: Category breakdown + Top consumers */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* Category breakdown */}
                <div className="bg-card border border-border/50 rounded-[1.5rem] p-6">
                    <h3 className="font-medium tracking-tight text-foreground mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 opacity-50" /> By Category</h3>
                    <div className="space-y-4">
                        {byCategory.sort((a, b) => b.kwh - a.kwh).slice(0, 6).map((c: any) => (
                            <div key={c.category}>
                                <div className="flex justify-between mb-1.5">
                                    <span className="text-sm text-muted-foreground capitalize">{c.category}</span>
                                    <span className="text-sm font-medium text-foreground">{(c.kwh || 0).toFixed(1)} kWh</span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${c.pct || 0}%`, backgroundColor: CAT_COLORS[c.category] || 'hsl(var(--primary))' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top consumers */}
                <div className="bg-card border border-border/50 rounded-[1.5rem] p-6">
                    <h3 className="font-medium tracking-tight text-foreground mb-6 flex items-center gap-2"><Zap className="w-4 h-4 opacity-50" /> Top Consumers</h3>
                    <div className="space-y-4">
                        {topConsumers.slice(0, 5).map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-muted-foreground text-sm font-mono w-5">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{c.brand ? `${c.brand} ${c.name}` : c.name}</p>
                                    <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct || 0}%` }} />
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground font-mono shrink-0">₹{(c.cost_inr || 0).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                    <Link href="/appliances" className="mt-6 text-xs text-primary hover:text-foreground flex items-center gap-1 transition-colors font-medium">
                        Manage appliances <Plus className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* Score + CO2 row */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="bg-card border border-border/50 rounded-[1.5rem] p-6 flex flex-col items-center justify-center">
                    <Award className="w-6 h-6 opacity-50 mb-3" />
                    <p className={`text-5xl font-medium tracking-tighter mb-1 ${effColor(homeScore)}`}>{homeScore}</p>
                    <p className="text-muted-foreground text-sm font-light">Efficiency Score</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">out of 100</p>
                </div>
                <div className="bg-card border border-border/50 rounded-[1.5rem] p-6 lg:col-span-2">
                    <h3 className="font-medium tracking-tight text-foreground mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 opacity-50" /> Sustainability</h3>
                    <div className="flex items-end gap-4">
                        <div>
                            <p className="text-4xl font-medium tracking-tighter text-foreground">{co2Kg.toFixed(0)} <span className="text-xl text-muted-foreground">kg</span></p>
                            <p className="text-muted-foreground text-sm mt-1 font-light">CO₂ equivalent this month</p>
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-2xl font-medium text-foreground">{Math.min(100, homeScore + 10)}<span className="text-sm text-muted-foreground">/100</span></p>
                            <p className="text-xs text-muted-foreground font-light">Sustainability score</p>
                        </div>
                    </div>
                    <Link href="/billing" className="mt-6 text-xs text-primary hover:text-foreground flex items-center gap-1 transition-colors font-medium">
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

    const { data: appliances = [] } = useQuery({
        queryKey: ['my_appliances', activeHomeId],
        queryFn: () => fetchApi(`/appliances/?home_id=${activeHomeId}`),
        enabled: !!activeHomeId,
        staleTime: 2 * 60 * 1000,
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
        <div className="space-y-4">
            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-3xl font-medium tracking-tight text-foreground">{activeHome?.name || 'My Home'}</h1>
                <p className="text-muted-foreground text-sm font-light mt-1">{activeHome?.city || ''} • Energy Dashboard</p>
            </div>
            {data.has_appliances === false ? <EmptyDashboard /> : <FullDashboard data={data} appliances={appliances} />}
        </div>
    );
}
