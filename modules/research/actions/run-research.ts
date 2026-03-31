"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { discoverKeywords } from "../services/keyword-discovery"
import { scoreKeywordRelevance } from "../services/relevance-scorer"
import type { SiteProfile } from "@/modules/sites/types"
import type { ResearchResult } from "../types"

export async function runResearch(
  siteId: string,
  locationCode: number = 2826
): Promise<ResearchResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, keywordsFound: 0, error: "Site not found" }

  const profile = site.seoProfile as SiteProfile | null
  const seedKeywords = profile?.keywords ?? (site.topics as string[]) ?? []

  if (seedKeywords.length === 0) {
    return {
      success: false,
      keywordsFound: 0,
      error: "No seed keywords available. Complete site onboarding first.",
    }
  }

  try {
    const discovery = await discoverKeywords({
      siteUrl: site.url,
      seedKeywords,
      locationCode,
    })

    if (discovery.keywords.length === 0) {
      return {
        success: false,
        keywordsFound: 0,
        error: discovery.errors.length > 0
          ? discovery.errors.join("; ")
          : "No keywords found",
      }
    }

    const scoring = await scoreKeywordRelevance({
      siteNiche: site.niche ?? "unknown",
      siteAudience: site.audience ?? "unknown",
      siteTopics: (site.topics as string[]) ?? [],
      keywords: discovery.keywords.map((k) => k.keyword),
    })

    const scoreMap = new Map(
      scoring.scores.map((s) => [s.keyword.toLowerCase(), s])
    )

    let created = 0
    for (const kw of discovery.keywords) {
      const score = scoreMap.get(kw.keyword.toLowerCase())

      await prisma.keyword.upsert({
        where: {
          siteId_keyword: { siteId, keyword: kw.keyword },
        },
        update: {
          searchVolume: kw.searchVolume,
          cpc: kw.cpc,
          competition: kw.competition,
          relevanceScore: score?.relevance ?? null,
          intent: score?.intent ?? null,
          cluster: score?.cluster ?? null,
        },
        create: {
          siteId,
          keyword: kw.keyword,
          searchVolume: kw.searchVolume,
          cpc: kw.cpc,
          competition: kw.competition,
          relevanceScore: score?.relevance ?? null,
          intent: score?.intent ?? null,
          cluster: score?.cluster ?? null,
          status: "discovered",
        },
      })
      created++
    }

    revalidatePath(`/sites/${siteId}/research`)
    revalidatePath(`/sites/${siteId}`)
    revalidatePath("/sites")
    return { success: true, keywordsFound: created }
  } catch (error) {
    return {
      success: false,
      keywordsFound: 0,
      error: `Research failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
