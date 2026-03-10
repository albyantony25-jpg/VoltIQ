"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react"

export type AlertData = {
    id: string;
    severity: string; // 'critical', 'warning', 'info'
    message: string;
    triggered_at: string;
}

interface RecentAlertsWidgetProps {
    alerts: AlertData[];
}

function getAlertStyles(severity: string) {
    switch (severity.toLowerCase()) {
        case 'critical':
            return {
                icon: <AlertCircle className="h-5 w-5 text-red-500" />,
                bg: "bg-red-500/10",
                border: "border-red-500/20",
                text: "text-red-400"
            }
        case 'warning':
            return {
                icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
                text: "text-amber-400"
            }
        default:
            return {
                icon: <Info className="h-5 w-5 text-blue-500" />,
                bg: "bg-blue-500/10",
                border: "border-blue-500/20",
                text: "text-blue-400"
            }
    }
}

function timeAgo(dateString: string) {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function RecentAlertsWidget({ alerts }: RecentAlertsWidgetProps) {
    return (
        <Card className="border-slate-800 bg-card h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl flex justify-between items-center">
                    <span>Recent Activity & Alerts</span>
                    <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                    </button>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {(!alerts || alerts.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                        </div>
                        <p className="text-slate-300 font-semibold text-lg">You're doing great!</p>
                        <p className="text-slate-500 text-sm mt-1">No pending alerts or issues found in your home.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map((alert) => {
                            const styles = getAlertStyles(alert.severity);
                            return (
                                <div key={alert.id} className={`p-4 rounded-xl border ${styles.border} ${styles.bg} flex items-start gap-4 transition-all hover:bg-opacity-20`}>
                                    <div className="mt-0.5">
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-200">{alert.message}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs font-mono text-slate-500">{timeAgo(alert.triggered_at)}</span>
                                            {alert.severity !== 'info' && (
                                                <>
                                                    <span className="text-slate-700 mx-1">•</span>
                                                    <button className={`text-xs font-bold ${styles.text} hover:underline`}>
                                                        Resolve
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
