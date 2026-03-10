"use client"

import { useState } from "react"
import { AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react"

interface AnomalyAlertProps {
    month: string;
    expected: number;
    actual: number;
    deviation_pct: number;
    explanation: string;
}

export function AnomalyAlert({ month, expected, actual, deviation_pct, explanation }: AnomalyAlertProps) {
    const [hidden, setHidden] = useState(false)
    const [expanded, setExpanded] = useState(false)

    if (hidden) return null;

    const isHigh = deviation_pct > 0;
    const colorClass = isHigh ? "amber" : "blue"; // Anomalies can be surprisingly low (good) or high (bad)
    const textBase = isHigh ? "text-amber-500" : "text-blue-500";
    const bgBase = isHigh ? "bg-amber-500/10 border-amber-500/20" : "bg-blue-500/10 border-blue-500/20";

    return (
        <div className={`w-full rounded-xl border ${bgBase} p-4 mb-6 shadow-sm flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-top-4`}>
            <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 ${textBase} shrink-0 mt-0.5`} />

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-bold ${isHigh ? 'text-amber-400' : 'text-blue-400'}`}>
                            Anomaly Detected: {month}
                        </h4>
                        <button onClick={() => setHidden(true)} className="text-slate-500 hover:text-white transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="text-sm text-slate-300 mt-1">
                        Usage was <span className="font-bold">{Math.abs(deviation_pct).toFixed(1)}% {isHigh ? 'higher' : 'lower'}</span> than expected
                        (<span className="font-mono">{actual}</span> kWh vs <span className="font-mono">{expected}</span> kWh).
                    </p>

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={`mt-2 flex items-center text-xs font-semibold ${textBase} hover:underline`}
                    >
                        {expanded ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide Details</> : <><ChevronDown className="h-3 w-3 mr-1" /> View Reason</>}
                    </button>

                    {expanded && (
                        <div className="mt-3 p-3 bg-black/20 rounded-lg text-sm text-slate-300 leading-relaxed border border-white/5 animate-in fade-in slide-in-from-top-1">
                            {explanation}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
