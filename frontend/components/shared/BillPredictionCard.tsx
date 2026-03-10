"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp } from "lucide-react"

interface BillPredictionCardProps {
    projected_amount: number;
    projected_units: number;
    confidence: number; // 0 to 1
    range_low: number;
    range_high: number;
    days_elapsed: number;
}

export function BillPredictionCard({ projected_amount, projected_units, confidence, range_low, range_high, days_elapsed }: BillPredictionCardProps) {
    const [displayAmount, setDisplayAmount] = useState(0)
    const prefersReducedMotion = useReducedMotion()

    useEffect(() => {
        if (prefersReducedMotion) {
            setDisplayAmount(projected_amount);
            return;
        }

        // Animate counter
        const duration = 1500;
        const steps = 60;
        const stepTime = duration / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            // Easing function outExpo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setDisplayAmount(projected_amount * easeProgress);

            if (currentStep >= steps) {
                clearInterval(timer);
                setDisplayAmount(projected_amount);
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [projected_amount, prefersReducedMotion])

    const confidencePct = Math.round(confidence * 100);

    return (
        <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950/20 h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700"></div>

            <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            <p className="text-sm font-medium text-indigo-300">AI Bill Prediction</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Based on {days_elapsed}/30 days elapsed</p>
                    </div>
                </div>

                <div className="mt-6 mb-8">
                    <p className="text-slate-400 text-sm mb-1">Month-End Projection</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold tracking-tight text-white">
                            ₹{displayAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-slate-500 font-mono text-sm">/ mo</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-3 font-mono">
                        ~{Math.round(projected_units)} kWh expected usage
                    </p>
                </div>

                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Confidence Score</span>
                        <span className="text-xs font-mono text-indigo-300">{confidencePct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${confidencePct}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-mono pt-1">
                        <span>Range: ₹{Math.round(range_low).toLocaleString('en-IN')}</span>
                        <span>₹{Math.round(range_high).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
