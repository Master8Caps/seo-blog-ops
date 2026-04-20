"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"

interface SiteRow {
  siteId: string
  siteName: string
  siteSlug: string
  totalGbp: number
  thisMonthGbp: number
  publishedPostCount: number
  avgPerPublishedPostGbp: number | null
  lastActivity: Date | null
}

interface SiteComparisonTableProps {
  sites: SiteRow[]
}

export function SiteComparisonTable({ sites }: SiteComparisonTableProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3">Sites</h3>
      <div className="text-xs">
        <div className="grid grid-cols-[1fr_100px_100px_80px_100px_100px] gap-2 px-2 py-2 text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Site</span>
          <span className="text-right">Total</span>
          <span className="text-right">This month</span>
          <span className="text-right">Posts</span>
          <span className="text-right">Avg/post</span>
          <span className="text-right">Last activity</span>
        </div>
        {sites.length === 0 && <p className="text-center py-6 text-muted-foreground">No data yet.</p>}
        {sites.map((s) => (
          <Link
            key={s.siteId}
            href={`/sites/${s.siteSlug}/costs`}
            className="grid grid-cols-[1fr_100px_100px_80px_100px_100px] gap-2 px-2 py-2.5 border-b border-border/50 hover:bg-muted/30"
          >
            <span>{s.siteName}</span>
            <span className="text-right">£{s.totalGbp.toFixed(2)}</span>
            <span className="text-right">£{s.thisMonthGbp.toFixed(2)}</span>
            <span className="text-right">{s.publishedPostCount}</span>
            <span className="text-right">
              {s.avgPerPublishedPostGbp !== null
                ? `£${s.avgPerPublishedPostGbp.toFixed(3)}`
                : "—"}
            </span>
            <span className="text-right text-muted-foreground">
              {s.lastActivity
                ? new Date(s.lastActivity).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                : "—"}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
