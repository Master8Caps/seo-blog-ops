"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import {
  getKeywordsForKeywords,
  getKeywordsForSite,
  type KeywordData,
} from "@/lib/seo/client"
import { scoreKeywordRelevance } from "../services/relevance-scorer"
import type { SiteProfile } from "@/modules/sites/types"

const TOP_KEYWORDS_LIMIT = 50

interface StepResult {
  success: boolean
  keywordsFound: number
  error?: string
}

/**
 * Step 1: Discover keywords from seed keywords via DataForSEO
 * Saves raw keywords to DB immediately (no AI scoring yet)
 */
export async function discoverFromSeeds(siteId: string): Promise<StepResult> {
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
    const results = await getKeywordsForKeywords(seedKeywords)
    const saved = await saveKeywords(siteId, results)
    revalidatePath(`/sites/${site.slug}/research`)
    return { success: true, keywordsFound: saved }
  } catch (error) {
    return {
      success: false,
      keywordsFound: 0,
      error: `Seed keyword discovery failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Step 2: Discover keywords from site URL via DataForSEO
 * Saves raw keywords to DB immediately (no AI scoring yet)
 */
export async function discoverFromSite(siteId: string): Promise<StepResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, keywordsFound: 0, error: "Site not found" }

  try {
    const results = await getKeywordsForSite(site.url)
    const saved = await saveKeywords(siteId, results)
    revalidatePath(`/sites/${site.slug}/research`)
    return { success: true, keywordsFound: saved }
  } catch (error) {
    return {
      success: false,
      keywordsFound: 0,
      error: `Site keyword discovery failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Step 3: Score top keywords with AI
 * Takes the top N keywords by search volume that don't have scores yet, scores them
 */
export async function scoreTopKeywords(siteId: string): Promise<StepResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, keywordsFound: 0, error: "Site not found" }

  try {
    // Get unscored keywords, sorted by volume, capped
    const unscored = await prisma.keyword.findMany({
      where: { siteId, relevanceScore: null },
      orderBy: { searchVolume: "desc" },
      take: TOP_KEYWORDS_LIMIT,
    })

    if (unscored.length === 0) {
      return { success: true, keywordsFound: 0 }
    }

    const scoring = await scoreKeywordRelevance({
      siteNiche: site.niche ?? "unknown",
      siteAudience: site.audience ?? "unknown",
      siteTopics: (site.topics as string[]) ?? [],
      keywords: unscored.map((k) => k.keyword),
    })

    const scoreMap = new Map(
      scoring.scores.map((s) => [s.keyword.toLowerCase(), s])
    )

    for (const kw of unscored) {
      const score = scoreMap.get(kw.keyword.toLowerCase())
      if (score) {
        await prisma.keyword.update({
          where: { id: kw.id },
          data: {
            relevanceScore: score.relevance,
            intent: score.intent,
            cluster: score.cluster,
          },
        })
      }
    }

    revalidatePath(`/sites/${site.slug}/research`)
    revalidatePath(`/sites/${site.slug}`)
    revalidatePath("/sites")
    return { success: true, keywordsFound: unscored.length }
  } catch (error) {
    return {
      success: false,
      keywordsFound: 0,
      error: `AI scoring failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/** Save keywords to DB, deduplicating by keyword text */
async function saveKeywords(
  siteId: string,
  keywords: KeywordData[]
): Promise<number> {
  // Sort by volume descending and cap
  const top = keywords
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, TOP_KEYWORDS_LIMIT)

  let saved = 0
  for (const kw of top) {
    await prisma.keyword.upsert({
      where: {
        siteId_keyword: { siteId, keyword: kw.keyword },
      },
      update: {
        searchVolume: kw.searchVolume,
        cpc: kw.cpc,
        competition: kw.competition,
      },
      create: {
        siteId,
        keyword: kw.keyword,
        searchVolume: kw.searchVolume,
        cpc: kw.cpc,
        competition: kw.competition,
        status: "discovered",
      },
    })
    saved++
  }

  return saved
}
