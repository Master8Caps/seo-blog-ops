import { notFound } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { getSiteCosts } from "@/modules/costs/actions/get-site-costs"
import { CostKpiCard } from "@/components/costs/cost-kpi-card"
import { CostTrendChart } from "@/components/costs/cost-trend-chart"
import { CostItemizedTable } from "@/components/costs/cost-itemized-table"
import { BiggestSpikeCallout } from "@/components/costs/biggest-spike-callout"
import { formatGbp, formatUsd, formatGbpDelta } from "@/lib/format"

interface PageProps {
  params: Promise<{ siteSlug: string }>
}

export default async function SiteCostsPage({ params }: PageProps) {
  const { siteSlug } = await params
  const site = await prisma.site.findUnique({
    where: { slug: siteSlug },
    select: { id: true, name: true },
  })
  if (!site) notFound()

  const summary = await getSiteCosts({ siteId: site.id })

  return (
    <div className="flex flex-col gap-5 p-6">
      <BiggestSpikeCallout spike={summary.biggestSpike} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CostKpiCard
          label="Total spent"
          value={formatGbp(summary.totalGbp)}
          sub={`${formatUsd(summary.totalUsd)} USD`}
        />
        <CostKpiCard
          label="This month"
          value={formatGbp(summary.thisMonthGbp)}
          sub={formatGbpDelta(summary.monthDeltaGbp)}
          subClassName={summary.monthDeltaGbp >= 0 ? "text-amber-500" : "text-green-500"}
        />
        <CostKpiCard
          label="Avg per published post"
          value={
            summary.avgPerPublishedPostGbp !== null
              ? formatGbp(summary.avgPerPublishedPostGbp)
              : "—"
          }
          sub={`across ${summary.publishedPostCount} posts`}
        />
        <CostKpiCard
          label="Spend split"
          value=""
          sub={`Content ${summary.splitContentPct.toFixed(0)}% · Research ${summary.splitResearchPct.toFixed(0)}% · Onboard ${summary.splitOnboardingPct.toFixed(0)}%`}
        />
      </div>

      <CostTrendChart data={summary.trend} />
      <CostItemizedTable items={summary.items} />
    </div>
  )
}
