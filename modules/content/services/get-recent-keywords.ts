import { prisma } from "@/lib/db/prisma"

export interface RecentKeywordsResult {
  keywords: string[]
  clusters: string[]
}

const RECENT_WINDOW_DAYS = 30
const RECENT_POST_LIMIT = 20

/**
 * Returns the primary keywords and clusters used in recent posts on this site.
 * Window: last 20 posts OR last 30 days, whichever yields fewer rows. Both caps apply.
 */
export async function getRecentKeywordsAndClusters(
  siteId: string
): Promise<RecentKeywordsResult> {
  const cutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const rows = await prisma.post.findMany({
    where: {
      siteId,
      createdAt: { gte: cutoff },
      keywordId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: RECENT_POST_LIMIT,
    select: {
      keyword: { select: { keyword: true, cluster: true } },
    },
  })

  const keywordSet = new Set<string>()
  const clusterSet = new Set<string>()
  for (const r of rows) {
    if (r.keyword?.keyword) keywordSet.add(r.keyword.keyword)
    if (r.keyword?.cluster) clusterSet.add(r.keyword.cluster)
  }

  return {
    keywords: Array.from(keywordSet),
    clusters: Array.from(clusterSet),
  }
}
