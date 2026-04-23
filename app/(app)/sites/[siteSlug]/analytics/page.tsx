import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { getSiteAnalytics, type AnalyticsWindow } from "@/modules/integrations/services/get-site-analytics"
import { AnalyticsKpiCards } from "@/modules/integrations/components/AnalyticsKpiCards"
import { ClicksOverTimeChart } from "@/modules/integrations/components/ClicksOverTimeChart"
import { AnalyticsTables } from "@/modules/integrations/components/AnalyticsTables"
import { RefreshAnalyticsButton } from "@/modules/integrations/components/RefreshAnalyticsButton"

export const dynamic = "force-dynamic"

export default async function SiteAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteSlug: string }>
  searchParams: Promise<{ window?: string }>
}) {
  const { siteSlug } = await params
  const { window: windowParam } = await searchParams

  const site = await prisma.site.findUnique({
    where: { slug: siteSlug },
    select: { id: true, slug: true, name: true, gscProperty: true },
  })
  if (!site) notFound()

  const window: AnalyticsWindow = windowParam === "7d" || windowParam === "90d" ? windowParam : "28d"
  const data = await getSiteAnalytics(site.id, window)

  if (!data.hasGscProperty) {
    return (
      <div className="container max-w-6xl py-8 space-y-6">
        <h1 className="text-2xl font-semibold">{site.name} — Analytics</h1>
        <div className="rounded border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm">
            This site is not yet linked to a GSC property.{" "}
            <a className="underline" href="/settings/integrations/google">
              Link it in Google integration settings
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{site.name} — Analytics</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data.lastSyncedAt
              ? `Last synced: ${new Date(data.lastSyncedAt).toLocaleString()}`
              : "Not yet synced"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <WindowSwitcher slug={siteSlug} current={window} />
          <RefreshAnalyticsButton siteId={site.id} siteSlug={siteSlug} />
        </div>
      </div>

      <AnalyticsKpiCards kpis={data.kpis} />
      <ClicksOverTimeChart data={data.trend} />
      <AnalyticsTables topPages={data.topPages} topQueries={data.topQueries} />
    </div>
  )
}

function WindowSwitcher({ slug, current }: { slug: string; current: AnalyticsWindow }) {
  const options: AnalyticsWindow[] = ["7d", "28d", "90d"]
  return (
    <div className="flex rounded border overflow-hidden text-xs">
      {options.map((opt) => (
        <a
          key={opt}
          href={`/sites/${slug}/analytics?window=${opt}`}
          className={`px-3 py-1 ${opt === current ? "bg-blue-600 text-white" : "hover:bg-muted"}`}
        >
          {opt}
        </a>
      ))}
    </div>
  )
}
