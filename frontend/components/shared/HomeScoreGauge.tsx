"use client"

import { useReducedMotion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface HomeScoreGaugeProps {
    score: number;
    subscores: {
        efficiency: number;
        savings: number;
        sustainability: number;
    }
}

export function HomeScoreGauge({ score, subscores }: HomeScoreGaugeProps) {
    const prefersReducedMotion = useReducedMotion()

    // Determine color and grade
    let color = "#ef4444"; // Red
    let grade = "C";
    let bgGradient = "from-red-500/20";

    if (score >= 80) {
        color = "#10b981"; // Green
        grade = "A+";
        bgGradient = "from-emerald-500/20";
    } else if (score >= 70) {
        color = "#10b981"; // Green
        grade = "A";
        bgGradient = "from-emerald-500/20";
    } else if (score >= 55) {
        color = "#f59e0b"; // Yellow
        grade = "B";
        bgGradient = "from-yellow-500/20";
    }

    // SVG parameters
    const size = 300;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
        <Card className={`border-slate-800 bg-card h-full w-full flex flex-col relative overflow-hidden items-center justify-center py-4`}>
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${bgGradient} to-transparent rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none`}></div>

            <CardHeader className="pb-0 relative z-10">
                <CardTitle className="text-xl">VoltIQ Home Score</CardTitle>
                <CardDescription>Overall unified performance metric</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center px-4 pt-2 relative z-10 w-full">

                {/* SVG Radial Gauge */}
                <div className="relative w-full aspect-square max-w-[280px] flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 overflow-visible drop-shadow-xl" viewBox={`0 0 ${size} ${size}`}>
                        {/* Background track */}
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke="#1e293b" // slate-800
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />
                        {/* Progress track */}
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={prefersReducedMotion ? offset : offset} // Init offset
                            style={prefersReducedMotion ? {} : { transition: 'stroke-dashoffset 1.5s ease-out' }}
                        />
                    </svg>
                    {/* Inner Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
                        <span className="text-6xl font-black text-white tracking-tighter" style={{ textShadow: `0 0 20px ${color}40` }}>
                            {score}
                        </span>
                        <div className="flex items-center gap-2 mt-1 -ml-1">
                            <span className="text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded-sm uppercase tracking-widest shadow-sm">Grade</span>
                            <span className="text-xl font-bold" style={{ color }}>{grade}</span>
                        </div>
                    </div>
                </div>

                {/* Subscores */}
                <div className="w-full grid grid-cols-3 gap-2 px-2 mt-auto">
                    {[
                        { label: "Efficiency", val: subscores.efficiency },
                        { label: "Potential", val: subscores.savings },
                        { label: "Eco-Friendly", val: subscores.sustainability },
                    ].map((item, i) => (
                        <div key={i} className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-lg flex flex-col items-center text-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">{item.label}</span>
                            <span className="text-lg font-bold text-slate-200">{item.val}</span>
                            <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-400 rounded-full"
                                    style={{
                                        width: `${item.val}%`,
                                        transition: prefersReducedMotion ? 'none' : 'width 1.5s ease-out'
                                    }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>

            </CardContent>
        </Card>
    )
}
