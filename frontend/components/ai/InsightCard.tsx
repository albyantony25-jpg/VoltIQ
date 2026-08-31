"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Zap, HelpCircle } from "lucide-react"

interface InsightCardProps {
    title: string;
    description: string;
    impact: 'HIGH' | 'MED' | 'LOW';
    savings_inr?: number;
    reasoning: string;
    type: 'recommendation' | 'insight';
    effort?: 'easy' | 'medium' | 'hard';
    index: number;
}

export function InsightCard({ title, description, impact, savings_inr, reasoning, type, effort, index }: InsightCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [done, setDone] = useState(false)
    const prefersReducedMotion = useReducedMotion()

    // Animation delay based on index
    const delay = index * 0.1;

    const getImpactColor = (lvl: string) => {
        if (lvl === 'HIGH') return "bg-red-500/10 text-red-500 border-red-500/20";
        if (lvl === 'MED') return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    }

    const getEffortDots = (eff?: string) => {
        if (!eff) return null;
        const count = eff === 'hard' ? 3 : eff === 'medium' ? 2 : 1;
        return (
            <div className="flex items-center gap-0.5 ml-2" title={`Effort: ${eff}`}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= count ? 'bg-slate-400' : 'bg-slate-700'}`}></div>
                ))}
            </div>
        )
    }

    if (done) {
        return (
            <motion.div
                initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
                animate={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
            >
                <Card className="border-emerald-500/20 bg-emerald-500/5 h-[80px] flex items-center px-6">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mr-4" />
                    <p className="text-slate-300 font-medium line-through decoration-slate-500">{title}</p>
                    <span className="ml-auto text-sm text-emerald-400 font-semibold">+₹{savings_inr?.toLocaleString('en-IN')} Secured</span>
                </Card>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
        >
            <Card
                className={`border-border/50 bg-card hover:border-primary/20 transition-all duration-300 shadow-sm`}
            >
                <CardContent className="p-5">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                            {type === 'recommendation' ? (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Zap className="h-5 w-5 text-primary" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <Lightbulb className="h-5 w-5 text-blue-400" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 pointer-events-auto">
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-base font-medium tracking-tight text-foreground truncate pr-4">{title}</h4>
                                <Badge variant="outline" className={`${getImpactColor(impact)} text-[10px] font-bold tracking-wider ${impact === 'HIGH' && !prefersReducedMotion ? 'animate-pulse' : ''}`}>
                                    {impact} IMPACT
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-3">
                                {description}
                            </p>

                            {type === 'recommendation' && savings_inr !== undefined && (
                                <div className="flex items-center gap-4 mb-4 text-xs">
                                    <span className="font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                        Save ~₹{savings_inr.toLocaleString('en-IN')}/yr
                                    </span>
                                    <div className="flex items-center text-muted-foreground font-light">
                                        Effort {getEffortDots(effort)}
                                    </div>
                                </div>
                            )}

                            {expanded && (
                                <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border/50 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="flex items-start gap-2">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">AI Reasoning</p>
                                            <p className="text-sm text-foreground font-light leading-relaxed">{reasoning}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center pl-14">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center transition-colors"
                        >
                            {expanded ? (
                                <><ChevronUp className="h-4 w-4 mr-1" /> Hide Reasoning</>
                            ) : (
                                <><ChevronDown className="h-4 w-4 mr-1" /> Why this matters?</>
                            )}
                        </button>

                        {type === 'recommendation' && (
                            <button
                                onClick={() => setDone(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-4 py-1.5 rounded-md transition-all hover:scale-[1.02] shadow-sm"
                            >
                                Mark as Done
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
