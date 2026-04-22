"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { generateAnglesForKeyword } from "@/modules/content/services/generate-angles"

type KeywordStatus = "discovered" | "approved" | "used" | "rejected"

export async function updateKeywordStatus(
  keywordId: string,
  status: KeywordStatus
) {
  const keyword = await prisma.keyword.update({
    where: { id: keywordId },
    data: { status },
    include: { site: true },
  })

  if (status === "approved") {
    await maybeGenerateAngles(keyword.id)
  }

  revalidatePath(`/sites/${keyword.site.slug}/research`)
  return keyword
}

export async function bulkUpdateKeywordStatus(
  keywordIds: string[],
  status: KeywordStatus
) {
  if (keywordIds.length === 0) return

  const first = await prisma.keyword.findFirst({
    where: { id: keywordIds[0] },
    include: { site: { select: { slug: true } } },
  })

  await prisma.keyword.updateMany({
    where: { id: { in: keywordIds } },
    data: { status },
  })

  if (status === "approved") {
    // Run sequentially to avoid rate-limit storms. 10-30 approvals in one click
    // is the realistic upper bound; each call takes ~3-5s. Users see the
    // approval badge flip immediately (the updateMany above already committed);
    // angle generation happens before revalidatePath so the next page load
    // shows accurate angle counts.
    for (const id of keywordIds) {
      await maybeGenerateAngles(id)
    }
  }

  if (first) {
    revalidatePath(`/sites/${first.site.slug}/research`)
  }
}

async function maybeGenerateAngles(keywordId: string) {
  const kw = await prisma.keyword.findUnique({
    where: { id: keywordId },
    include: {
      site: {
        select: { id: true, niche: true, audience: true },
      },
      _count: { select: { angles: true } },
    },
  })
  if (!kw) return
  if (kw._count.angles > 0) return // already has angles, skip

  const result = await generateAnglesForKeyword({
    keywordId: kw.id,
    keyword: kw.keyword,
    siteId: kw.site.id,
    siteNiche: kw.site.niche ?? "unknown",
    siteAudience: kw.site.audience ?? "unknown",
    cluster: kw.cluster,
  })

  if (!result.success) {
    console.warn(
      `[update-keyword] angle generation failed for ${kw.keyword} (${kw.id}): ${result.error}`
    )
  }
}
