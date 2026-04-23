import { prisma } from "@/lib/db/prisma"

export type AnalyticsWindow = "7d" | "28d" | "90d"

export interface SiteAnalyticsSummary {
  siteId: string
  hasGscProperty: boolean
  window: AnalyticsWindow
  kpis: {
    clicks: number
    impressions: number
    ctr: number
    avgPosition: number
    clicksPrev: number
    impressionsPrev: number
    ctrPrev: number
    avgPositionPrev: number
  }
  trend: Array<{ date: string; clicks: number; impressions: number }>
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  lastSyncedAt: Date | null
}

function windowDays(w: AnalyticsWindow): number {
  return w === "7d" ? 7 : w === "28d" ? 28 : 90
}

export async function getSiteAnalytics(
  siteId: string,
  window: AnalyticsWindow = "28d"
): Promise<SiteAnalyticsSummary> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, gscProperty: true },
  })
  if (!site) throw new Error("Site not found")

  if (!site.gscProperty) {
    return {
      siteId,
      hasGscProperty: false,
      window,
      kpis: {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        avgPosition: 0,
        clicksPrev: 0,
        impressionsPrev: 0,
        ctrPrev: 0,
        avgPositionPrev: 0,
      },
      trend: [],
      topPages: [],
      topQueries: [],
      lastSyncedAt: null,
    }
  }

  const days = windowDays(window)
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days)
  const prevStart = new Date(start)
  prevStart.setUTCDate(prevStart.getUTCDate() - days)

  const [current, previous, latest, topPages, topQueries] = await Promise.all([
    prisma.gscMetricDaily.findMany({
      where: { siteId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    }),
    prisma.gscMetricDaily.findMany({
      where: { siteId, date: { gte: prevStart, lt: start } },
    }),
    prisma.gscMetricDaily.findFirst({
      where: { siteId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.gscMetricPage.findMany({
      where: { siteId, window: "28d" },
      orderBy: { clicks: "desc" },
      take: 25,
    }),
    prisma.gscMetricQuery.findMany({
      where: { siteId, window: "28d" },
      orderBy: { clicks: "desc" },
      take: 25,
    }),
  ])

  const sumClicks = (rows: typeof current) => rows.reduce((s, r) => s + r.clicks, 0)
  const sumImpressions = (rows: typeof current) => rows.reduce((s, r) => s + r.impressions, 0)
  const avgPosition = (rows: typeof current) =>
    rows.length === 0 ? 0 : rows.reduce((s, r) => s + r.position, 0) / rows.length

  const clicks = sumClicks(current)
  const impressions = sumImpressions(current)
  const ctr = impressions === 0 ? 0 : clicks / impressions
  const clicksPrev = sumClicks(previous)
  const impressionsPrev = sumImpressions(previous)
  const ctrPrev = impressionsPrev === 0 ? 0 : clicksPrev / impressionsPrev

  return {
    siteId,
    hasGscProperty: true,
    window,
    kpis: {
      clicks,
      impressions,
      ctr,
      avgPosition: avgPosition(current),
      clicksPrev,
      impressionsPrev,
      ctrPrev,
      avgPositionPrev: avgPosition(previous),
    },
    trend: current.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      clicks: r.clicks,
      impressions: r.impressions,
    })),
    topPages: topPages.map((p) => ({
      page: p.page,
      clicks: p.clicks,
      impressions: p.impressions,
      ctr: p.ctr,
      position: p.position,
    })),
    topQueries: topQueries.map((q) => ({
      query: q.query,
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.ctr,
      position: q.position,
    })),
    lastSyncedAt: latest?.date ?? null,
  }
}
