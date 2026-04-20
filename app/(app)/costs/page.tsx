import { getGlobalCosts } from "@/modules/costs/actions/get-global-costs"
import { CostKpiCard } from "@/components/costs/cost-kpi-card"
import { CostTrendChart } from "@/components/costs/cost-trend-chart"
import { SiteComparisonTable } from "@/components/costs/site-comparison-table"
import { ProviderDonut } from "@/components/costs/provider-donut"
import { BiggestSpikeCallout } from "@/components/costs/biggest-spike-callout"

export default async function GlobalCostsPage() {
  const summary = await getGlobalCosts({})

  return (
    <div className="flex flex-col gap-5 p-6">
      <BiggestSpikeCallout spike={summary.biggestSpike} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CostKpiCard
          label="Total spent (all time)"
          value={`£${summary.totalGbp.toFixed(2)}`}
        />
        <CostKpiCard
          label="This month"
          value={`£${summary.thisMonthGbp.toFixed(2)}`}
          sub={`${summary.monthDeltaGbp >= 0 ? "+" : ""}£${summary.monthDeltaGbp.toFixed(2)} vs last`}
          subClassName={summary.monthDeltaGbp >= 0 ? "text-amber-500" : "text-green-500"}
        />
        <CostKpiCard
          label="Projected month-end"
          value={`£${summary.monthProjectedGbp.toFixed(2)}`}
          sub="linear from spend so far"
        />
        <CostKpiCard
          label="Posts published"
          value={String(summary.totalPostsPublished)}
          sub={
            summary.avgPerPublishedPostGbp !== null
              ? `avg £${summary.avgPerPublishedPostGbp.toFixed(3)}/post`
              : undefined
          }
        />
      </div>

      <CostTrendChart
        data={summary.trend.map((t) => ({ bucket: t.bucket, costGbp: t.costGbp }))}
        title="Spend over time"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SiteComparisonTable sites={summary.sites} />
        </div>
        <ProviderDonut providers={summary.providers} />
      </div>
    </div>
  )
}
