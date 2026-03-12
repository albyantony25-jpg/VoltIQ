"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle2, AlertTriangle, Info, Settings2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, useReducedMotion } from "framer-motion"
import { fetchApi } from "@/lib/api"
import { useEnergyStore } from "@/stores/useEnergyStore"
import { createBrowserClient } from "@/lib/supabase-browser"

export function TopNav() {
    const [isOpen, setIsOpen] = useState(false)
    const [hasSession, setHasSession] = useState(false)
    const queryClient = useQueryClient()
    const prefersReducedMotion = useReducedMotion()
    const { activeHomeId } = useEnergyStore()
    const supabase = createBrowserClient()

    // Check session to guard queries
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setHasSession(!!session)
        }
        checkSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setHasSession(!!session)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // Fetch Alerts
    const { data: alerts = [], isLoading } = useQuery({
        queryKey: ['alerts', activeHomeId],
        queryFn: async () => {
            if (!activeHomeId) return []
            return fetchApi(`/alerts/home/${activeHomeId}`)
        },
        enabled: !!activeHomeId && hasSession,
        refetchInterval: 30000 // Poll every 30s
    })

    // Run Cron Check (Mocking the backend cron job hitting every hour)
    const runCronMutation = useMutation({
        mutationFn: async () => {
            if (!activeHomeId) return
            return fetchApi(`/alerts/home/${activeHomeId}/check`, { method: 'POST' })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts', activeHomeId] })
        }
    })

    // Mark as Read
    const markReadMutation = useMutation({
        mutationFn: async (alertId: string) => {
            return fetchApi(`/alerts/${alertId}/read`, { method: 'PATCH' })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts', activeHomeId] })
        }
    })

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            if (!activeHomeId) return
            return fetchApi(`/alerts/home/${activeHomeId}/read-all`, { method: 'PATCH' })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts', activeHomeId] })
            setIsOpen(false)
        }
    })

    const unreadCount = alerts.filter((a: any) => !a.is_read).length;

    // Helper for icons based on severity/category
    const getAlertIcon = (alert: any) => {
        if (alert.severity === 'CRITICAL') return <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />;
        if (alert.severity === 'WARNING') return <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />;
        if (alert.category === 'MAINTENANCE') return <Settings2 className="h-5 w-5 text-blue-400 shrink-0" />;
        return <Info className="h-5 w-5 text-indigo-400 shrink-0" />;
    }

    return (
        <div className="w-full h-16 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <span className="text-slate-200 font-semibold text-lg">My Dashboard</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
            </div>

            <div className="flex items-center gap-4 relative">
                {/* Dev Cron Trigger */}
                <button
                    onClick={() => runCronMutation.mutate()}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold tracking-wider"
                    title="Simulate backend cron job scanning for anomalies"
                >
                    Run Scan
                </button>

                {/* Notifications Bell */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 rounded-full hover:bg-slate-800 transition-colors"
                >
                    <Bell className="h-5 w-5 text-slate-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
                    )}
                </button>

                {/* Dropdown Panel */}
                {isOpen && (
                    <div className="absolute top-12 right-0 w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <div>
                                <h3 className="font-bold text-white leading-none">Notifications</h3>
                                <p className="text-xs text-slate-500 mt-1">{unreadCount} unread alerts</p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllReadMutation.mutate()}
                                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                                >
                                    <CheckCircle2 className="w-3 h-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {isLoading ? (
                                <div className="p-8 text-center text-sm text-slate-500">Loading alerts...</div>
                            ) : alerts.length === 0 ? (
                                <motion.div
                                    initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-10 text-center flex flex-col items-center relative overflow-hidden"
                                >
                                    {/* SVG Checkmark Empty State */}
                                    <div className="relative mb-5 w-24 h-24 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full"></div>
                                        <svg width="100" height="100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative">
                                            <circle cx="60" cy="60" r="45" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" className={prefersReducedMotion ? "" : "animate-[spin_20s_linear_infinite]"} />
                                            <circle cx="60" cy="60" r="35" fill="#022c22" stroke="#059669" strokeWidth="4" />
                                            <path d="M42 63L54 75L80 45" stroke="#34d399" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className={prefersReducedMotion ? "" : "animate-[draw_1s_ease-out_forwards]"} strokeDasharray="100" strokeDashoffset="0" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-200 mb-1">All Clear!</h3>
                                    <p className="text-sm text-slate-400">No active anomalies detected.</p>
                                </motion.div>
                            ) : (
                                <div className="divide-y divide-slate-800/50">
                                    {alerts.map((alert: any) => (
                                        <div
                                            key={alert.id}
                                            className={`p-4 hover:bg-slate-800/50 transition-colors cursor-pointer flex gap-3 ${!alert.is_read ? 'bg-indigo-500/5' : 'opacity-70'}`}
                                            onClick={() => {
                                                if (!alert.is_read) markReadMutation.mutate(alert.id);
                                            }}
                                        >
                                            <div className="mt-0.5">
                                                {getAlertIcon(alert)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`text-sm font-semibold truncate ${!alert.is_read ? 'text-slate-200' : 'text-slate-400'}`}>
                                                        {alert.title}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                    {alert.message}
                                                </p>
                                            </div>
                                            {!alert.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
