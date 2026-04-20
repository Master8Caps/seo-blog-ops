"use server"

import { prisma } from "@/lib/db/prisma"

export interface SiteRow {
  siteId: string
  siteName: string
  siteSlug: string
  totalGbp: number
  thisMonthGbp: number
  publishedPostCount: number
  avgPerPublishedPostGbp: number | null
  lastActivity: Date | null
}

export interface ProviderShare {
  provider: string
  costGbp: number
  pct: number
}

export interface GlobalCostSummary {
  totalGbp: number
  thisMonthGbp: number
  monthDeltaGbp: number
  monthProjectedGbp: number
  totalPostsPublished: number
  avgPerPublishedPostGbp: number | null
  trend: { bucket: string; costGbp: number; group: string }[]
  trendStackedBy: "site" | "provider" | "operation"
  sites: SiteRow[]
  providers: ProviderShare[]
  biggestSpike: { costGbp: number; date: Date; itemTitle: string; itemLink: string } | null
}

interface GetGlobalCostsInput {
  bucket?: "monthly" | "weekly" | "daily"
  stackedBy?: "site" | "provider" | "operation"
  dateFrom?: Date
  dateTo?: Date
  siteIds?: string[]
}

export async function getGlobalCosts(
  input: GetGlobalCostsInput = {}
): Promise<GlobalCostSummary> {
  const { bucket = "monthly", stackedBy = "provider" } = input

  const where = {
    ...(input.dateFrom || input.dateTo
      ? {
          createdAt: {
            ...(input.dateFrom ? { gte: input.dateFrom } : {}),
            ...(input.dateTo ? { lte: input.dateTo } : {}),
          },
        }
      : {}),
    ...(input.siteIds && input.siteIds.length > 0
      ? { siteId: { in: input.siteIds } }
      : {}),
  }

  const events = await prisma.usageEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  const totalGbp = events.reduce((s, e) => s + Number(e.costGbp), 0)

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

  let thisMonthGbp = 0
  let lastMonthGbp = 0
  for (const e of events) {
    const t = e.createdAt.getTime()
    if (t >= monthStart.getTime()) thisMonthGbp += Number(e.costGbp)
    else if (t >= lastMonthStart.getTime()) lastMonthGbp += Number(e.costGbp)
  }
  const daysIntoMonth = Math.max(1, now.getUTCDate())
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  ).getUTCDate()
  const monthProjectedGbp = (thisMonthGbp / daysIntoMonth) * daysInMonth

  // Site rollups
  const sitesAgg = await prisma.usageEvent.groupBy({
    by: ["siteId"],
    where: { ...where, siteId: { not: null } },
    _sum: { costGbp: true },
    _max: { createdAt: true },
  })
  const siteIds = sitesAgg
    .map((s) => s.siteId)
    .filter((x): x is string => !!x)
  const siteRows = await prisma.site.findMany({
    where: { id: { in: siteIds } },
    select: { id: true, name: true, slug: true },
  })
  const siteMap = new Map(siteRows.map((s) => [s.id, s]))

  // Per-site published post count
  const publishedAgg = await prisma.usageEvent.groupBy({
    by: ["siteId", "postId"],
    where: {
      ...where,
      siteId: { not: null },
      postId: { not: null },
      post: { status: "published" },
    },
    _sum: { costGbp: true },
  })
  const perSitePublished = new Map<string, { count: number; totalGbp: number }>()
  for (const p of publishedAgg) {
    if (!p.siteId) continue
    const existing = perSitePublished.get(p.siteId) ?? { count: 0, totalGbp: 0 }
    existing.count += 1
    existing.totalGbp += Number(p._sum.costGbp ?? 0)
    perSitePublished.set(p.siteId, existing)
  }

  // This-month per site
  const thisMonthPerSite = new Map<string, number>()
  for (const e of events) {
    if (!e.siteId) continue
    if (e.createdAt.getTime() >= monthStart.getTime()) {
      thisMonthPerSite.set(
        e.siteId,
        (thisMonthPerSite.get(e.siteId) ?? 0) + Number(e.costGbp)
      )
    }
  }

  const sites: SiteRow[] = sitesAgg
    .filter((s) => s.siteId && siteMap.has(s.siteId))
    .map((s) => {
      const site = siteMap.get(s.siteId!)!
      const pub = perSitePublished.get(s.siteId!) ?? { count: 0, totalGbp: 0 }
      return {
        siteId: s.siteId!,
        siteName: site.name,
        siteSlug: site.slug,
        totalGbp: Number(s._sum.costGbp ?? 0),
        thisMonthGbp: thisMonthPerSite.get(s.siteId!) ?? 0,
        publishedPostCount: pub.count,
        avgPerPublishedPostGbp: pub.count > 0 ? pub.totalGbp / pub.count : null,
        lastActivity: s._max.createdAt,
      }
    })
    .sort((a, b) => b.totalGbp - a.totalGbp)

  // Provider donut
  const providerMap = new Map<string, number>()
  for (const e of events) {
    providerMap.set(e.provider, (providerMap.get(e.provider) ?? 0) + Number(e.costGbp))
  }
  const providers: ProviderShare[] = [...providerMap.entries()]
    .map(([provider, costGbp]) => ({
      provider,
      costGbp,
      pct: totalGbp > 0 ? (costGbp / totalGbp) * 100 : 0,
    }))
    .sort((a, b) => b.costGbp - a.costGbp)

  // Trend (stacked)
  const trendMap = new Map<string, number>()
  for (const e of events) {
    const bucketK = bucketKey(e.createdAt, bucket)
    const groupK =
      stackedBy === "site"
        ? siteMap.get(e.siteId ?? "")?.name ?? "Unattributed"
        : stackedBy === "provider"
        ? e.provider
        : e.operation
    const key = `${bucketK}|${groupK}`
    trendMap.set(key, (trendMap.get(key) ?? 0) + Number(e.costGbp))
  }
  const trend = [...trendMap.entries()]
    .map(([k, costGbp]) => {
      const [bucket, group] = k.split("|")
      return { bucket, group, costGbp }
    })
    .sort((a, b) => a.bucket.localeCompare(b.bucket))

  const totalPostsPublished = [...perSitePublished.values()].reduce(
    (s, x) => s + x.count,
    0
  )
  const totalPublishedGbp = [...perSitePublished.values()].reduce(
    (s, x) => s + x.totalGbp,
    0
  )
  const avgPerPublishedPostGbp =
    totalPostsPublished > 0 ? totalPublishedGbp / totalPostsPublished : null

  // Biggest spike — largest cost unit (post / research run / onboarding) in last 30 days,
  // NOT the largest single API call.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recent = events.filter((e) => e.createdAt >= thirtyDaysAgo)
  let biggestSpike: GlobalCostSummary["biggestSpike"] = null
  if (recent.length > 0) {
    const unitGroups = new Map<
      string,
      { cost: number; latestEvent: (typeof recent)[number] }
    >()
    for (const e of recent) {
      const key = e.postId
        ? `post:${e.postId}`
        : e.researchRunId
        ? `run:${e.researchRunId}`
        : `onboard:${e.siteId ?? "unattributed"}`
      const existing = unitGroups.get(key)
      if (existing) {
        existing.cost += Number(e.costGbp)
        if (e.createdAt > existing.latestEvent.createdAt) existing.latestEvent = e
      } else {
        unitGroups.set(key, { cost: Number(e.costGbp), latestEvent: e })
      }
    }
    if (unitGroups.size >= 2) {
      const units = [...unitGroups.values()]
      const top = units.reduce((a, b) => (a.cost > b.cost ? a : b))
      const others = units.filter((u) => u !== top)
      const avgOfOthers =
        others.reduce((sum, u) => sum + u.cost, 0) / Math.max(others.length, 1)
      // Only surface as a spike if top is materially above the rest.
      if (top.cost >= avgOfOthers * 1.5 && top.cost - avgOfOthers >= 0.05) {
        biggestSpike = await resolveSpikeLink(
          { ...top.latestEvent, costGbp: top.cost },
          siteMap
        )
      }
    }
  }

  return {
    totalGbp,
    thisMonthGbp,
    monthDeltaGbp: thisMonthGbp - lastMonthGbp,
    monthProjectedGbp,
    totalPostsPublished,
    avgPerPublishedPostGbp,
    trend,
    trendStackedBy: stackedBy,
    sites,
    providers,
    biggestSpike,
  }
}

function bucketKey(d: Date, bucket: "monthly" | "weekly" | "daily"): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  if (bucket === "monthly") return `${y}-${m}`
  if (bucket === "daily") return `${y}-${m}-${day}`
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return `${monday.getUTCFullYear()}-W${String(monday.getUTCDate()).padStart(2, "0")}`
}

async function resolveSpikeLink(
  event: {
    costGbp: unknown
    createdAt: Date
    postId: string | null
    researchRunId: string | null
    siteId: string | null
  },
  siteMap: Map<string, { id: string; name: string; slug: string }>
) {
  const slug = event.siteId ? siteMap.get(event.siteId)?.slug ?? "" : ""
  if (event.postId) {
    const post = await prisma.post.findUnique({
      where: { id: event.postId },
      select: { title: true, slug: true },
    })
    return {
      costGbp: Number(event.costGbp),
      date: event.createdAt,
      itemTitle: post?.title ?? "Post",
      itemLink: post && slug ? `/sites/${slug}/content/${post.slug}` : `/costs`,
    }
  }
  if (event.researchRunId) {
    return {
      costGbp: Number(event.costGbp),
      date: event.createdAt,
      itemTitle: "Research run",
      itemLink: slug ? `/sites/${slug}/research#run-${event.researchRunId}` : `/costs`,
    }
  }
  return {
    costGbp: Number(event.costGbp),
    date: event.createdAt,
    itemTitle: "Onboarding",
    itemLink: slug ? `/sites/${slug}` : `/costs`,
  }
}
