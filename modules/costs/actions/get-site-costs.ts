"use server"

import { prisma } from "@/lib/db/prisma"

const CONTENT_OPS = new Set(["generate-content", "humanize", "image-gen", "classify-taxonomy"])
const RESEARCH_OPS = new Set(["score-keywords", "select-keywords", "kw-for-site", "kw-for-keywords"])
const ONBOARDING_OPS = new Set(["site-analysis", "crawl"])

export type ItemKind = "blog" | "research" | "onboarding" | "other"

export interface ItemizedRow {
  id: string
  date: Date
  kind: ItemKind
  title: string
  operationsSummary: string
  costGbp: number
  link: string
}

export interface SpikeCallout {
  costGbp: number
  date: Date
  itemTitle: string
  itemLink: string
}

export interface SiteCostSummary {
  totalGbp: number
  totalUsd: number
  thisMonthGbp: number
  monthDeltaGbp: number
  avgPerPublishedPostGbp: number | null
  publishedPostCount: number
  splitContentPct: number
  splitResearchPct: number
  splitOnboardingPct: number
  trend: { bucket: string; costGbp: number }[]
  items: ItemizedRow[]
  biggestSpike: SpikeCallout | null
}

interface GetSiteCostsInput {
  siteId: string
  bucket?: "monthly" | "weekly" | "daily"
}

export async function getSiteCosts(input: GetSiteCostsInput): Promise<SiteCostSummary> {
  const { siteId, bucket = "monthly" } = input

  const [allEvents, site] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.site.findUnique({
      where: { id: siteId },
      select: { slug: true },
    }),
  ])

  const slug = site?.slug ?? siteId
  const totalGbp = allEvents.reduce((s, e) => s + Number(e.costGbp), 0)
  const totalUsd = allEvents.reduce((s, e) => s + Number(e.costUsd), 0)

  // Month boundaries
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

  let thisMonthGbp = 0
  let lastMonthGbp = 0
  for (const e of allEvents) {
    const t = e.createdAt.getTime()
    if (t >= monthStart.getTime()) thisMonthGbp += Number(e.costGbp)
    else if (t >= lastMonthStart.getTime()) lastMonthGbp += Number(e.costGbp)
  }

  // Spend split
  let contentTotal = 0, researchTotal = 0, onboardingTotal = 0
  for (const e of allEvents) {
    const c = Number(e.costGbp)
    if (CONTENT_OPS.has(e.operation)) contentTotal += c
    else if (RESEARCH_OPS.has(e.operation)) researchTotal += c
    else if (ONBOARDING_OPS.has(e.operation)) onboardingTotal += c
  }
  const splitDenom = contentTotal + researchTotal + onboardingTotal || 1

  // Avg per published post
  const publishedPostsWithCost = await prisma.usageEvent.groupBy({
    by: ["postId"],
    where: {
      siteId,
      postId: { not: null },
      post: { status: "published" },
    },
    _sum: { costGbp: true },
  })
  const publishedTotals = publishedPostsWithCost.map((p) => Number(p._sum.costGbp ?? 0))
  const avgPerPublishedPostGbp =
    publishedTotals.length > 0
      ? publishedTotals.reduce((a, b) => a + b, 0) / publishedTotals.length
      : null

  const trend = bucketize(allEvents, bucket)
  const items = await buildItemizedRows(siteId, slug)

  // Biggest spike — largest cost unit (post / research run / onboarding) in last 30 days.
  // NOT the largest single API call — that's a misleading "spike" because it's always
  // just one slice of one blog.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recent = allEvents.filter((e) => e.createdAt >= thirtyDaysAgo)
  let biggestSpike: SpikeCallout | null = null
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
        : `onboard:${siteId}`
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
      // Only show if top is materially above the rest: ≥1.5× the avg of others
      // AND at least 5p above them. Otherwise it's just "the biggest" — not a spike.
      if (top.cost >= avgOfOthers * 1.5 && top.cost - avgOfOthers >= 0.05) {
        biggestSpike = await buildSpikeCallout(
          { ...top.latestEvent, costGbp: top.cost },
          slug
        )
      }
    }
  }

  return {
    totalGbp,
    totalUsd,
    thisMonthGbp,
    monthDeltaGbp: thisMonthGbp - lastMonthGbp,
    avgPerPublishedPostGbp,
    publishedPostCount: publishedTotals.length,
    splitContentPct: (contentTotal / splitDenom) * 100,
    splitResearchPct: (researchTotal / splitDenom) * 100,
    splitOnboardingPct: (onboardingTotal / splitDenom) * 100,
    trend,
    items,
    biggestSpike,
  }
}

function bucketize(
  events: Array<{ createdAt: Date; costGbp: unknown }>,
  bucket: "monthly" | "weekly" | "daily"
): { bucket: string; costGbp: number }[] {
  const map = new Map<string, number>()
  for (const e of events) {
    const key = bucketKey(e.createdAt, bucket)
    map.set(key, (map.get(key) ?? 0) + Number(e.costGbp))
  }
  return [...map.entries()]
    .map(([bucket, costGbp]) => ({ bucket, costGbp }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
}

function bucketKey(d: Date, bucket: "monthly" | "weekly" | "daily"): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  if (bucket === "monthly") return `${y}-${m}`
  if (bucket === "daily") return `${y}-${m}-${day}`
  // weekly — Monday start
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return `${monday.getUTCFullYear()}-W${String(monday.getUTCDate()).padStart(2, "0")}`
}

async function buildItemizedRows(siteId: string, slug: string): Promise<ItemizedRow[]> {
  const [posts, runs, onboardingRollup] = await Promise.all([
    prisma.usageEvent.groupBy({
      by: ["postId"],
      where: { siteId, postId: { not: null } },
      _sum: { costGbp: true },
      _max: { createdAt: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["researchRunId"],
      where: { siteId, researchRunId: { not: null } },
      _sum: { costGbp: true },
      _max: { createdAt: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        siteId,
        operation: { in: ["site-analysis", "crawl"] },
        postId: null,
        researchRunId: null,
      },
      _sum: { costGbp: true },
      _min: { createdAt: true },
    }),
  ])

  const postIds = posts.map((p) => p.postId).filter((x): x is string => !!x)
  const runIds = runs.map((r) => r.researchRunId).filter((x): x is string => !!x)

  const [postRows, runRows] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, title: true, slug: true },
    }),
    prisma.researchRun.findMany({
      where: { id: { in: runIds } },
      select: { id: true, startedAt: true, keywordsDiscovered: true, keywordsAiPicked: true },
    }),
  ])

  const postMap = new Map(postRows.map((p) => [p.id, p]))
  const runMap = new Map(runRows.map((r) => [r.id, r]))

  const items: ItemizedRow[] = []

  for (const p of posts) {
    if (!p.postId) continue
    const post = postMap.get(p.postId)
    if (!post) continue
    items.push({
      id: p.postId,
      date: p._max.createdAt ?? new Date(0),
      kind: "blog",
      title: post.title,
      operationsSummary: "Gen\u00b7Hum\u00b7Img\u00b7Cls",
      costGbp: Number(p._sum.costGbp ?? 0),
      link: `/sites/${slug}/content/${post.slug}`,
    })
  }

  for (const r of runs) {
    if (!r.researchRunId) continue
    const run = runMap.get(r.researchRunId)
    if (!run) continue
    items.push({
      id: r.researchRunId,
      date: r._max.createdAt ?? run.startedAt,
      kind: "research",
      title: `Research run \u00b7 ${run.keywordsDiscovered} keywords \u00b7 ${run.keywordsAiPicked} AI-picked`,
      operationsSummary: "DFS\u00b7Score\u00b7Pick",
      costGbp: Number(r._sum.costGbp ?? 0),
      link: `/sites/${slug}/research#run-${r.researchRunId}`,
    })
  }

  if (Number(onboardingRollup._sum.costGbp ?? 0) > 0) {
    items.push({
      id: `onboarding-${siteId}`,
      date: onboardingRollup._min.createdAt ?? new Date(0),
      kind: "onboarding",
      title: "Initial site analysis",
      operationsSummary: "Crawl\u00b7Analyze",
      costGbp: Number(onboardingRollup._sum.costGbp ?? 0),
      link: `/sites/${slug}`,
    })
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime())
}

async function buildSpikeCallout(
  event: { costGbp: unknown; createdAt: Date; postId: string | null; researchRunId: string | null; siteId: string | null },
  slug: string
): Promise<SpikeCallout> {
  let title = "Cost event"
  let link = `/sites/${slug}/costs`

  if (event.postId) {
    const post = await prisma.post.findUnique({
      where: { id: event.postId },
      select: { title: true, slug: true },
    })
    if (post) {
      title = post.title
      link = `/sites/${slug}/content/${post.slug}`
    }
  } else if (event.researchRunId) {
    title = "Research run"
    link = `/sites/${slug}/research#run-${event.researchRunId}`
  } else {
    title = "Onboarding"
    link = `/sites/${slug}`
  }

  return {
    costGbp: Number(event.costGbp),
    date: event.createdAt,
    itemTitle: title,
    itemLink: link,
  }
}
