"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Props {
  data: Array<{ date: string; clicks: number; impressions: number }>
}

export function ClicksOverTimeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded border p-8 text-center text-sm text-muted-foreground">
        No data yet — Google typically has a 2-3 day lag. Check back in 72 hours.
      </div>
    )
  }
  return (
    <div className="rounded border p-4">
      <h3 className="text-sm font-medium mb-2">Clicks over time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
