import { prisma } from "@/lib/db/prisma"
import { getSearchConsoleClient, type SearchConsoleClient } from "./gsc-client"
import { logUsageEvent } from "@/lib/usage/log"

export interface SyncResult {
  siteId: string
  skipped: boolean
  reason?: string
  daily?: number
  pages?: number
  queries?: number
  error?: string
}

const WINDOW = "28d"

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function queryGsc(
  sc: SearchConsoleClient,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[]
): Promise<Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>> {
  const start = Date.now()
  try {
    const { data } = await sc.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions, rowLimit: 5000 },
    })
    await logUsageEvent({
      provider: "google",
      model: "search-console-api",
      operation: "gsc-sync",
      units: { apiCallCount: 1 },
      attribution: {},
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      metadata: { dimensions, startDate, endDate, rowCount: data.rows?.length ?? 0 },
    })
    return (data.rows ?? []).map((r) => ({
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }))
  } catch (err) {
    await logUsageEvent({
      provider: "google",
      model: "search-console-api",
      operation: "gsc-sync",
      units: { apiCallCount: 1 },
      attribution: {},
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

export async function syncSiteMetrics(siteId: string): Promise<SyncResult> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, gscProperty: true },
  })

  if (!site) return { siteId, skipped: true, reason: "site not found" }
  if (!site.gscProperty) return { siteId, skipped: true, reason: "no GSC property linked" }

  const existingDailyCount = await prisma.gscMetricDaily.count({ where: { siteId } })
  const dailyDays = existingDailyCount === 0 ? 90 : 3

  const sc = await getSearchConsoleClient()

  // 1. Daily totals
  const dailyRows = await queryGsc(sc, site.gscProperty, daysAgo(dailyDays), daysAgo(1), ["date"])
  for (const row of dailyRows) {
    const date = new Date(row.keys[0])
    await prisma.gscMetricDaily.upsert({
      where: { siteId_date: { siteId, date } },
      create: {
        siteId,
        date,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
      update: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    })
  }

  // 2. Pages — replace the 28-day window
  const pageRows = await queryGsc(sc, site.gscProperty, daysAgo(28), daysAgo(1), ["page"])
  await prisma.gscMetricPage.deleteMany({ where: { siteId, window: WINDOW } })
  if (pageRows.length > 0) {
    await prisma.gscMetricPage.createMany({
      data: pageRows.map((r) => ({
        siteId,
        page: r.keys[0],
        window: WINDOW,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      })),
    })
  }

  // 3. Queries — replace the 28-day window
  const queryRows = await queryGsc(sc, site.gscProperty, daysAgo(28), daysAgo(1), ["query"])
  await prisma.gscMetricQuery.deleteMany({ where: { siteId, window: WINDOW } })
  if (queryRows.length > 0) {
    await prisma.gscMetricQuery.createMany({
      data: queryRows.map((r) => ({
        siteId,
        query: r.keys[0],
        window: WINDOW,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      })),
    })
  }

  return {
    siteId,
    skipped: false,
    daily: dailyRows.length,
    pages: pageRows.length,
    queries: queryRows.length,
  }
}

export async function syncAllSites(): Promise<{
  totalSites: number
  synced: number
  skipped: number
  failed: Array<{ siteId: string; error: string }>
}> {
  const sites = await prisma.site.findMany({
    where: { gscProperty: { not: null } },
    select: { id: true },
  })

  const failed: Array<{ siteId: string; error: string }> = []
  let synced = 0
  let skipped = 0

  for (const site of sites) {
    try {
      const result = await syncSiteMetrics(site.id)
      if (result.skipped) skipped++
      else synced++
    } catch (err) {
      failed.push({
        siteId: site.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { totalSites: sites.length, synced, skipped, failed }
}
