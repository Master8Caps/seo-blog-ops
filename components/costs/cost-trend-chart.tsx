"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"

interface CostTrendChartProps {
  data: { bucket: string; costGbp: number }[]
  title?: string
}

export function CostTrendChart({ data, title = "Spend over time" }: CostTrendChartProps) {
  const [bucket, setBucket] = useState<"monthly" | "weekly" | "daily">("monthly")
  // bucket toggle is visual-only for now (server re-fetch on change is a follow-up)

  const max = Math.max(...data.map((d) => d.costGbp), 0.01)
  const barWidth = 60
  const gap = 20
  const chartHeight = 120
  const totalWidth = Math.max(data.length, 1) * (barWidth + gap) + 30

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex gap-1 text-xs">
          {(["monthly", "weekly", "daily"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              className={`px-2.5 py-1 rounded ${
                bucket === b ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              {b[0].toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No data yet.</p>
      ) : (
        <svg viewBox={`0 0 ${totalWidth} 140`} className="w-full h-36">
          <line x1="30" y1={chartHeight} x2={totalWidth} y2={chartHeight} stroke="currentColor" strokeOpacity="0.1" />
          {data.map((d, i) => {
            const h = (d.costGbp / max) * chartHeight
            const x = 30 + i * (barWidth + gap)
            return (
              <g key={d.bucket}>
                <rect
                  x={x}
                  y={chartHeight - h}
                  width={barWidth}
                  height={h}
                  rx="2"
                  className="fill-blue-500"
                />
                <text x={x + barWidth / 2} y={135} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {d.bucket}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </Card>
  )
}
