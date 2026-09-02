"use client";

import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface LiveGaugeProps {
  value: number;
  max: number;
  unit?: string;
  label?: string;
  status?: React.ReactNode;
  segmentCount?: number;
  className?: string;
}

export function LiveGauge({
  value,
  max,
  unit = 'kW',
  label,
  status,
  segmentCount = 40,
  className,
}: LiveGaugeProps) {
  const shouldReduceMotion = useReducedMotion();
  
  // Safe math bounds
  const safeMax = Math.max(max, 0.001); // Prevent division by zero
  const clampedValue = Math.max(0, Math.min(value, safeMax));
  const progress = clampedValue / safeMax;

  // Gauge Geometry Constants
  // Center is 100, 100. Radius is 80.
  // We span from -210 degrees (bottom left) to 30 degrees (bottom right).
  // Total span is 240 degrees.
  const cx = 100;
  const cy = 100;
  const r = 80;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Pre-calculate segmented ticks
  const segments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < segmentCount; i++) {
      const angle = startAngle + (i / (segmentCount - 1)) * totalAngle;
      
      // Tick geometry
      const innerRadius = r - 10;
      const outerRadius = r;
      const x1 = cx + innerRadius * Math.cos(toRad(angle));
      const y1 = cy + innerRadius * Math.sin(toRad(angle));
      const x2 = cx + outerRadius * Math.cos(toRad(angle));
      const y2 = cy + outerRadius * Math.sin(toRad(angle));
      
      // Threshold for activation (0 to 1)
      const threshold = i / (segmentCount - 1);
      segs.push({ x1, y1, x2, y2, threshold });
    }
    return segs;
  }, [segmentCount, startAngle, totalAngle]);

  return (
    <div className={cn("relative w-full max-w-[280px] mx-auto flex flex-col items-center justify-center", className)}>
      <svg 
        viewBox="0 0 200 160" 
        className="w-full h-auto overflow-visible"
        aria-label={label ? `${label}: ${value.toFixed(1)} ${unit}` : `${value.toFixed(1)} ${unit}`}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {label && <title>{label}</title>}
        
        {/* Inactive Background Segments */}
        {segments.map((seg, i) => (
          <line
            key={`bg-${i}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke="hsl(var(--muted))"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        ))}

        {/* Active Semantic Segments */}
        {segments.map((seg, i) => {
          const isActive = progress >= seg.threshold;
          return (
            <motion.line
              key={`fg-${i}`}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke="hsl(var(--accent))"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ 
                duration: shouldReduceMotion ? 0 : 0.4,
                ease: "easeOut",
                delay: shouldReduceMotion ? 0 : i * 0.005 // Subtle fluid staggered sweep
              }}
            />
          );
        })}

        {/* Inner Subtle Reference Line */}
        <path 
          d={`M ${cx + (r - 18) * Math.cos(toRad(startAngle))} ${cy + (r - 18) * Math.sin(toRad(startAngle))} A ${r - 18} ${r - 18} 0 1 1 ${cx + (r - 18) * Math.cos(toRad(endAngle))} ${cy + (r - 18) * Math.sin(toRad(endAngle))}`}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.5"
          strokeOpacity="0.3"
          strokeDasharray="4 4"
        />

        {/* Scale Tick Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const tickAngle = startAngle + t * totalAngle;
          const textX = cx + (r - 32) * Math.cos(toRad(tickAngle));
          const textY = cy + (r - 32) * Math.sin(toRad(tickAngle));
          
          // Format numeric scale marks
          const val = (max * t).toFixed(1);
          
          return (
            <text 
              key={t}
              x={textX} 
              y={textY} 
              fill="currentColor" 
              className="text-muted-foreground" 
              fontSize="9" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontWeight="600"
            >
              {val}
            </text>
          );
        })}
      </svg>
      
      {/* Central Numerical Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
        <motion.div 
           className="text-5xl font-medium tracking-tighter tabular-nums text-foreground flex items-baseline gap-1.5"
           layout
        >
          {value.toFixed(1)} 
          {unit && (
            <span className="text-lg font-medium text-muted-foreground tracking-normal">
              {unit}
            </span>
          )}
        </motion.div>
        
        {label && (
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mt-1">
            {label}
          </span>
        )}
        
        {status && (
          <div className="mt-3 pointer-events-auto">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
