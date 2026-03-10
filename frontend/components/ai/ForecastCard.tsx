"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, TrendingUp } from "lucide-react"

interface ForecastCardProps {
    amount: number;
    kwh: number;
    confidence: number;
    low: number;
    high: number;
    factors: string[];
}

export function ForecastCard({ amount, kwh, confidence, low, high, factors }: ForecastCardProps) {
    const [displayAmount, setDisplayAmount] = useState(0)

    useEffect(() => {
        const duration = 1200;
        const steps = 40;
        const stepTime = duration / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setDisplayAmount(amount * easeProgress);

            if (currentStep >= steps) {
                clearInterval(timer);
                setDisplayAmount(amount);
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [amount])

    const pct = Math.round(confidence * 100);

    return (
        <Card className="border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-400">
                    <Sparkles className="h-5 w-5" /> AI Bill Forecast
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
                <div className="mb-6">
                    <p className="text-sm font-medium text-slate-400 mb-1">Predicted Next Month</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold tracking-tight text-white drop-shadow-md">
                            ₹{displayAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-sm font-mono text-slate-400 bg-black/20 px-3 py-1.5 rounded border border-white/5">
                        <span>Range: ₹{Math.round(low).toLocaleString('en-IN')}</span>
                        <span className="text-slate-600">—</span>
                        <span>₹{Math.round(high).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-slate-400 uppercase tracking-wider">Confidence</span>
                            <span className="text-indigo-400">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-1000"
                                style={{ width: `${pct}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Influencing Factors</p>
                        <ul className="space-y-2">
                            {factors.slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                    <span className="leading-snug">{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
