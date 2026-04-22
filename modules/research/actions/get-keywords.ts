"use server"

import { prisma } from "@/lib/db/prisma"

export async function getKeywordsForSiteId(
  siteId: string,
  status?: string
) {
  const rows = await prisma.keyword.findMany({
    where: {
      siteId,
      ...(status ? { status } : {}),
    },
    include: { _count: { select: { angles: true } } },
    orderBy: [
      { relevanceScore: "desc" },
      { searchVolume: "desc" },
    ],
  })

  return rows.map((r) => ({
    id: r.id,
    keyword: r.keyword,
    searchVolume: r.searchVolume,
    cpc: r.cpc,
    competition: r.competition,
    relevanceScore: r.relevanceScore,
    intent: r.intent,
    cluster: r.cluster,
    status: r.status,
    aiSelected: r.aiSelected,
    angleCount: r._count.angles,
  }))
}

export async function clearKeywords(siteId: string) {
  const site = await prisma.keyword.findFirst({
    where: { siteId },
    include: { site: { select: { slug: true } } },
  })
  await prisma.keyword.deleteMany({ where: { siteId } })
  if (site) {
    const { revalidatePath } = await import("next/cache")
    revalidatePath(`/sites/${site.site.slug}/research`)
  }
}

export async function getKeywordStats(siteId: string) {
  const [total, approved, discovered, aiApproved] = await Promise.all([
    prisma.keyword.count({ where: { siteId } }),
    prisma.keyword.count({ where: { siteId, status: "approved" } }),
    prisma.keyword.count({ where: { siteId, status: "discovered" } }),
    prisma.keyword.count({ where: { siteId, status: "approved", aiSelected: true } }),
  ])
  return { total, approved, discovered, aiApproved }
}
