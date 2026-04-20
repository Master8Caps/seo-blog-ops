import { getGlobalCosts } from "@/modules/costs/actions/get-global-costs"
import { CostKpiCard } from "@/components/costs/cost-kpi-card"
import { CostTrendChart } from "@/components/costs/cost-trend-chart"
import { SiteComparisonTable } from "@/components/costs/site-comparison-table"
import { ProviderDonut } from "@/components/costs/provider-donut"
import { BiggestSpikeCallout } from "@/components/costs/biggest-spike-callout"
import { formatGbp, formatGbpDelta } from "@/lib/format"

export default async function GlobalCostsPage() {
  const summary = await getGlobalCosts({})

  // The trend data has one row per (bucket, group) pair — the chart needs one row per bucket.
  // Collapse by summing across groups within each bucket.
  const collapsedTrend = Array.from(
    summary.trend.reduce((map, t) => {
      map.set(t.bucket, (map.get(t.bucket) ?? 0) + t.costGbp)
      return map
    }, new Map<string, number>())
  )
    .map(([bucket, costGbp]) => ({ bucket, costGbp }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket))

  return (
    <div className="flex flex-col gap-5 p-6">
      <BiggestSpikeCallout spike={summary.biggestSpike} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CostKpiCard
          label="Total spent (all time)"
          value={formatGbp(summary.totalGbp)}
        />
        <CostKpiCard
          label="This month"
          value={formatGbp(summary.thisMonthGbp)}
          sub={formatGbpDelta(summary.monthDeltaGbp)}
          subClassName={summary.monthDeltaGbp >= 0 ? "text-amber-500" : "text-green-500"}
        />
        <CostKpiCard
          label="Projected month-end"
          value={formatGbp(summary.monthProjectedGbp)}
          sub="linear from spend so far"
        />
        <CostKpiCard
          label="Posts published"
          value={String(summary.totalPostsPublished)}
          sub={
            summary.avgPerPublishedPostGbp !== null
              ? `avg ${formatGbp(summary.avgPerPublishedPostGbp)}/post`
              : undefined
          }
        />
      </div>

      <CostTrendChart data={collapsedTrend} title="Spend over time" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SiteComparisonTable sites={summary.sites} />
        </div>
        <ProviderDonut providers={summary.providers} />
      </div>
    </div>
  )
}
