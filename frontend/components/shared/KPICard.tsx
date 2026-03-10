"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion, animate } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDown, ArrowUp } from "lucide-react"

interface KPICardProps {
    title: string;
    value: string | number;
    unit?: string;
    change_pct?: number;
    change_direction?: 'up' | 'down';
    icon: React.ReactNode;
    color: string; // Tailwind class e.g. "bg-blue-500" or hex
    index?: number;
}

export function KPICard({ title, value, unit, change_pct, change_direction, icon, color, index = 0 }: KPICardProps) {
    // Determine if the change is "good" or "bad". 
    // In energy, going down is usually good (savings).
    const isGoodChange = change_direction === 'down';
    const arrowColor = isGoodChange ? "text-emerald-400" : "text-red-500";
    const bgColor = isGoodChange ? "bg-emerald-500/10" : "bg-red-500/10";

    const prefersReducedMotion = useReducedMotion();

    // Numeric animation state
    const [displayValue, setDisplayValue] = useState<string | number>("0");
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (prefersReducedMotion) {
            setDisplayValue(value);
            return;
        }

        // Clean value to numbers for animation if it's a string containing numbers (like "₹2,668")
        const numberVal = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;

        // If it's a valid number, we can animate it
        if (!isNaN(numberVal)) {
            const controls = animate(0, numberVal, {
                duration: 1.2,
                ease: "easeOut",
                onUpdate: (latest) => {
                    // Check if original was formatted currency
                    if (typeof value === 'string' && value.includes('₹')) {
                        setDisplayValue(`₹${Math.round(latest).toLocaleString('en-IN')}`);
                    }
                    // Floating point check
                    else if (typeof value === 'string' && value.includes('.')) {
                        setDisplayValue(latest.toFixed(1));
                    }
                    else {
                        setDisplayValue(Math.round(latest));
                    }
                }
            });
            return controls.stop;
        } else {
            // Un-animatable raw string
            setDisplayValue(value);
        }
    }, [value, prefersReducedMotion]);

    const delay = index * 0.15;

    return (
        <motion.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -4 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="h-full relative"
        >
            <Card className="relative overflow-hidden border-slate-800 bg-slate-900/50 transition-colors duration-300 h-full">
                {/* Subtle left border - expands slightly on hover */}
                <motion.div
                    className="absolute left-0 top-0 bottom-0"
                    style={{ backgroundColor: color }}
                    animate={{ width: isHovered ? 6 : 4 }}
                    transition={{ duration: 0.2 }}
                />

                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-slate-400">{title}</p>
                        <motion.div
                            className="p-2 rounded-lg bg-slate-800/80 text-slate-300"
                            animate={{ backgroundColor: isHovered ? "rgba(51, 65, 85, 0.9)" : "rgba(30, 41, 59, 0.8)" }}
                        >
                            {icon}
                        </motion.div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-3xl font-bold tracking-tight text-slate-50">{displayValue}</h3>
                            {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
                        </div>

                        {change_pct !== undefined && change_direction && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${bgColor} ${arrowColor}`}>
                                    {change_direction === 'up' ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                                    {change_pct}%
                                </span>
                                <span className="text-xs text-slate-500">vs last month</span>
                            </div>
                        )}
                    </div>
                </CardContent>

                {/* Dynamic hover shadow colored to match the KPI */}
                <motion.div
                    className="absolute inset-0 -z-10 rounded-xl blur-xl opacity-0"
                    style={{ backgroundColor: color }}
                    animate={{ opacity: isHovered && !prefersReducedMotion ? 0.1 : 0 }}
                    transition={{ duration: 0.3 }}
                />
            </Card>
        </motion.div>
    )
}
