"use server"

import { prisma } from "@/lib/db/prisma"
import { generateAnglesForKeyword } from "@/modules/content/services/generate-angles"

export interface BackfillAnglesResult {
  total: number
  processed: number
  successful: number
  failed: number
  errors: Array<{ keywordId: string; keyword: string; error: string }>
}

export async function backfillAngles(): Promise<BackfillAnglesResult> {
  // Find approved keywords with zero angles
  const candidates = await prisma.keyword.findMany({
    where: {
      status: "approved",
      angles: { none: {} },
    },
    include: {
      site: { select: { id: true, niche: true, audience: true } },
    },
  })

  const result: BackfillAnglesResult = {
    total: candidates.length,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  }

  for (const kw of candidates) {
    result.processed++
    const outcome = await generateAnglesForKeyword({
      keywordId: kw.id,
      keyword: kw.keyword,
      siteId: kw.site.id,
      siteNiche: kw.site.niche ?? "unknown",
      siteAudience: kw.site.audience ?? "unknown",
      cluster: kw.cluster,
    })
    if (outcome.success) {
      result.successful++
    } else {
      result.failed++
      result.errors.push({
        keywordId: kw.id,
        keyword: kw.keyword,
        error: outcome.error ?? "unknown",
      })
    }
  }

  return result
}

export async function regenerateAnglesForKeyword(keywordId: string) {
  const kw = await prisma.keyword.findUnique({
    where: { id: keywordId },
    include: {
      site: { select: { id: true, niche: true, audience: true, slug: true } },
    },
  })
  if (!kw) return { success: false, error: "Keyword not found" }

  const result = await generateAnglesForKeyword({
    keywordId: kw.id,
    keyword: kw.keyword,
    siteId: kw.site.id,
    siteNiche: kw.site.niche ?? "unknown",
    siteAudience: kw.site.audience ?? "unknown",
    cluster: kw.cluster,
    replace: true,
  })

  return result
}
