import { prisma } from "@/lib/db/prisma"

export interface RecentClusterPost {
  title: string
  excerpt: string | null
  angle: string | null
}

const CLUSTER_POST_LIMIT = 15

/**
 * Returns recent posts on this site in the same cluster as the given keyword.
 * Used as "differentiation context" for blog generation — the AI is told NOT
 * to duplicate these titles/angles. Cluster scoping keeps the list relevant
 * and the prompt lean.
 */
export async function getRecentClusterPosts(
  siteId: string,
  cluster: string | null
): Promise<RecentClusterPost[]> {
  if (!cluster) return []

  const rows = await prisma.post.findMany({
    where: {
      siteId,
      keyword: { cluster },
    },
    orderBy: { createdAt: "desc" },
    take: CLUSTER_POST_LIMIT,
    select: {
      title: true,
      excerpt: true,
      angle: { select: { text: true } },
    },
  })

  return rows.map((r) => ({
    title: r.title,
    excerpt: r.excerpt,
    angle: r.angle?.text ?? null,
  }))
}
