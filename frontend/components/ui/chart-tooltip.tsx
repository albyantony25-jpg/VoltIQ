"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  unit?: string
  valueFormatter?: (value: any) => React.ReactNode
  className?: string
  labelFormatter?: (label: any) => React.ReactNode
  hideLabel?: boolean
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  valueFormatter,
  className,
  labelFormatter,
  hideLabel = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover px-3 py-2.5 text-sm shadow-sm",
        className
      )}
    >
      {!hideLabel && label !== undefined && label !== null && (
        <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any, index: number) => {
          const value = valueFormatter ? valueFormatter(entry.value) : entry.value
          const color = entry.color || entry.payload?.fill || "hsl(var(--accent))"
          const name = entry.name || entry.dataKey

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground capitalize">{name}</span>
              </div>
              <span className="font-medium text-popover-foreground tabular-nums">
                {value}
                {unit && (
                  <span className="ml-1 text-muted-foreground font-normal">
                    {unit}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
