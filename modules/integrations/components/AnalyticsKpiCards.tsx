import type { SiteAnalyticsSummary } from "@/modules/integrations/services/get-site-analytics"

function delta(curr: number, prev: number): { pct: number; dir: "up" | "down" | "flat" } {
  if (prev === 0) return { pct: 0, dir: "flat" }
  const pct = ((curr - prev) / prev) * 100
  return { pct: Math.abs(pct), dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" }
}

function arrow(dir: "up" | "down" | "flat"): string {
  return dir === "up" ? "↑" : dir === "down" ? "↓" : "→"
}

export function AnalyticsKpiCards({ kpis }: { kpis: SiteAnalyticsSummary["kpis"] }) {
  const items = [
    { label: "Clicks", value: kpis.clicks.toLocaleString(), d: delta(kpis.clicks, kpis.clicksPrev) },
    { label: "Impressions", value: kpis.impressions.toLocaleString(), d: delta(kpis.impressions, kpis.impressionsPrev) },
    { label: "CTR", value: `${(kpis.ctr * 100).toFixed(2)}%`, d: delta(kpis.ctr, kpis.ctrPrev) },
    {
      label: "Avg position",
      value: kpis.avgPosition === 0 ? "—" : kpis.avgPosition.toFixed(1),
      d: { ...delta(kpis.avgPositionPrev, kpis.avgPosition) },
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <div key={it.label} className="rounded border p-4">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className="text-2xl font-semibold mt-1">{it.value}</div>
          <div className={`text-xs mt-1 ${it.d.dir === "up" ? "text-green-700" : it.d.dir === "down" ? "text-red-700" : "text-muted-foreground"}`}>
            {arrow(it.d.dir)} {it.d.pct.toFixed(1)}% vs prev period
          </div>
        </div>
      ))}
    </div>
  )
}
