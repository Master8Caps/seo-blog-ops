"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { formatGbp } from "@/lib/format"

type ItemKind = "blog" | "research" | "onboarding" | "other"

interface ItemRow {
  id: string
  date: Date
  kind: ItemKind
  title: string
  operationsSummary: string
  costGbp: number
  link: string
}

interface CostItemizedTableProps {
  items: ItemRow[]
}

const KIND_BADGE: Record<ItemKind, string> = {
  blog: "bg-blue-900/40 text-blue-300",
  research: "bg-violet-900/40 text-violet-300",
  onboarding: "bg-emerald-900/40 text-emerald-300",
  other: "bg-muted text-muted-foreground",
}

export function CostItemizedTable({ items }: CostItemizedTableProps) {
  const [filter, setFilter] = useState<ItemKind | "all">("all")
  const counts = items.reduce(
    (acc, it) => ({ ...acc, [it.kind]: (acc[it.kind] ?? 0) + 1 }),
    {} as Record<string, number>
  )
  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter)

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Itemized breakdown</h3>
        <div className="flex gap-1 text-xs">
          {(["all", "blog", "research", "onboarding"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as ItemKind | "all")}
              className={`px-2.5 py-1 rounded ${
                filter === f ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
              {f !== "all" && ` (${counts[f] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs">
        <div className="grid grid-cols-[90px_90px_1fr_120px_80px] gap-2 px-2 py-2 text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Date</span><span>Type</span><span>Item</span><span>Operations</span><span className="text-right">Cost</span>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-6 text-muted-foreground">No items.</p>
        )}
        {filtered.map((it) => (
          <Link
            key={it.id}
            href={it.link}
            className="grid grid-cols-[90px_90px_1fr_120px_80px] gap-2 px-2 py-2.5 border-b border-border/50 hover:bg-muted/30"
          >
            <span className="text-muted-foreground">
              {new Date(it.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
            <span>
              <span className={`px-2 py-0.5 rounded text-[11px] ${KIND_BADGE[it.kind]}`}>
                {it.kind[0].toUpperCase() + it.kind.slice(1)}
              </span>
            </span>
            <span className="truncate">{it.title}</span>
            <span className="text-muted-foreground">{it.operationsSummary}</span>
            <span className="text-right">{formatGbp(it.costGbp)}</span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
