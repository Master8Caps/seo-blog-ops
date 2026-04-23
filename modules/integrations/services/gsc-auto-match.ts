import { google } from "googleapis"
import { prisma } from "@/lib/db/prisma"
import { getAccessToken } from "@/lib/google/auth"
import { logUsageEvent } from "@/lib/usage/log"
import { extractDomain, normalizeUrl } from "./url-normalize"

export function scoreMatch(siteUrl: string, gscProperty: string): number {
  const siteDomain = extractDomain(siteUrl)
  const propDomain = extractDomain(gscProperty)

  if (gscProperty.startsWith("http")) {
    if (normalizeUrl(siteUrl) === normalizeUrl(gscProperty)) return 100
  }

  if (gscProperty.startsWith("sc-domain:")) {
    if (siteDomain === propDomain) return 95
    if (siteDomain.endsWith(`.${propDomain}`)) return 70
  }

  return 0
}

export interface AutoMatchResult {
  matched: Array<{ siteId: string; property: string }>
  ambiguous: Array<{ siteId: string; candidates: string[] }>
  unmatched: Array<{ siteId: string; siteUrl: string }>
}

const MATCH_THRESHOLD = 90

export async function autoMatchSitesToGscProperties(): Promise<AutoMatchResult> {
  const start = Date.now()
  const accessToken = await getAccessToken()
  const sc = google.searchconsole({
    version: "v1",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const { data } = await sc.sites.list()
  const properties = (data.siteEntry ?? [])
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl ?? "")
    .filter(Boolean)

  await logUsageEvent({
    provider: "google",
    model: "search-console-api",
    operation: "gsc-auto-match",
    units: { apiCallCount: 1 },
    attribution: {},
    costUsdOverride: 0,
    durationMs: Date.now() - start,
  })

  const sites = await prisma.site.findMany({ select: { id: true, url: true } })

  const result: AutoMatchResult = { matched: [], ambiguous: [], unmatched: [] }

  for (const site of sites) {
    const scored = properties
      .map((p) => ({ property: p, score: scoreMatch(site.url, p) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    if (scored.length === 0) {
      result.unmatched.push({ siteId: site.id, siteUrl: site.url })
      continue
    }

    const top = scored[0]
    const tied = scored.filter((s) => s.score === top.score)

    if (top.score >= MATCH_THRESHOLD && tied.length === 1) {
      try {
        await prisma.site.update({
          where: { id: site.id },
          data: { gscProperty: top.property },
        })
        result.matched.push({ siteId: site.id, property: top.property })
      } catch (err) {
        console.error(`[gsc-auto-match] update failed for site ${site.id}:`, err)
        result.unmatched.push({ siteId: site.id, siteUrl: site.url })
      }
    } else if (top.score >= MATCH_THRESHOLD && tied.length > 1) {
      result.ambiguous.push({ siteId: site.id, candidates: tied.map((t) => t.property) })
    } else {
      result.unmatched.push({ siteId: site.id, siteUrl: site.url })
    }
  }

  return result
}
