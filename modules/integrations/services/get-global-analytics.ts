import { prisma } from "@/lib/db/prisma"
import type { AnalyticsWindow } from "./get-site-analytics"

export interface GlobalAnalyticsSummary {
  window: AnalyticsWindow
  totals: {
    clicks: number
    impressions: number
    ctr: number
    avgPosition: number
  }
  trend: Array<{ date: string; clicks: number; impressions: number }>
  leaderboard: Array<{
    siteId: string
    slug: string
    name: string
    clicks: number
    impressions: number
    ctr: number
    avgPosition: number
  }>
}

function days(w: AnalyticsWindow): number {
  return w === "7d" ? 7 : w === "28d" ? 28 : 90
}

export async function getGlobalAnalytics(
  window: AnalyticsWindow = "28d"
): Promise<GlobalAnalyticsSummary> {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days(window))

  const sites = await prisma.site.findMany({
    where: { gscProperty: { not: null } },
    select: { id: true, slug: true, name: true },
  })

  const allRows = await prisma.gscMetricDaily.findMany({
    where: { date: { gte: start, lt: end } },
    select: { siteId: true, date: true, clicks: true, impressions: true, position: true },
  })

  const byDate = new Map<string, { clicks: number; impressions: number }>()
  for (const r of allRows) {
    const key = r.date.toISOString().slice(0, 10)
    const existing = byDate.get(key) ?? { clicks: 0, impressions: 0 }
    existing.clicks += r.clicks
    existing.impressions += r.impressions
    byDate.set(key, existing)
  }
  const trend = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  const bySite = new Map<string, { clicks: number; impressions: number; positionSum: number; positionN: number }>()
  for (const r of allRows) {
    const acc = bySite.get(r.siteId) ?? { clicks: 0, impressions: 0, positionSum: 0, positionN: 0 }
    acc.clicks += r.clicks
    acc.impressions += r.impressions
    acc.positionSum += r.position
    acc.positionN += 1
    bySite.set(r.siteId, acc)
  }
  const leaderboard = sites
    .map((site) => {
      const v = bySite.get(site.id) ?? { clicks: 0, impressions: 0, positionSum: 0, positionN: 0 }
      return {
        siteId: site.id,
        slug: site.slug,
        name: site.name,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions === 0 ? 0 : v.clicks / v.impressions,
        avgPosition: v.positionN === 0 ? 0 : v.positionSum / v.positionN,
      }
    })
    .sort((a, b) => b.clicks - a.clicks)

  const totalClicks = leaderboard.reduce((s, r) => s + r.clicks, 0)
  const totalImpr = leaderboard.reduce((s, r) => s + r.impressions, 0)
  const validPositions = leaderboard.filter((r) => r.avgPosition > 0)
  const totalAvgPos =
    validPositions.length === 0
      ? 0
      : validPositions.reduce((s, r) => s + r.avgPosition, 0) / validPositions.length

  return {
    window,
    totals: {
      clicks: totalClicks,
      impressions: totalImpr,
      ctr: totalImpr === 0 ? 0 : totalClicks / totalImpr,
      avgPosition: totalAvgPos,
    },
    trend,
    leaderboard,
  }
}
