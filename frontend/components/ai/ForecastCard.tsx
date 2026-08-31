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
        <Card className="border-border/50 bg-card overflow-hidden relative group shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" /> AI Bill Forecast
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
                <div className="mb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Predicted Next Month</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-medium tracking-tight text-foreground drop-shadow-sm">
                            ₹{displayAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-sm font-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded border border-border/30">
                        <span>Range: ₹{Math.round(low).toLocaleString('en-IN')}</span>
                        <span className="text-muted-foreground/50">—</span>
                        <span>₹{Math.round(high).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] font-medium mb-1.5">
                            <span className="text-muted-foreground uppercase tracking-wider">Confidence</span>
                            <span className="text-primary">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${pct}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Influencing Factors</p>
                        <ul className="space-y-2">
                            {factors.slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground font-light">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
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
