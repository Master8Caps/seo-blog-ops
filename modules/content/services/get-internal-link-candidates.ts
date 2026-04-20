import { prisma } from "@/lib/db/prisma"

export interface InternalLinkCandidate {
  title: string
  url: string
  excerpt: string | null
  category: string | null
  tags: string | null
}

/**
 * Returns the array of candidate posts the AI can link to during generation.
 * Excludes the post being currently regenerated (matched by slug if provided).
 */
export async function getInternalLinkCandidates(
  siteId: string,
  excludeSlug?: string
): Promise<InternalLinkCandidate[]> {
  const rows = await prisma.externalPost.findMany({
    where: {
      siteId,
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      title: true,
      url: true,
      excerpt: true,
      category: true,
      tags: true,
    },
  })

  return rows.map((r) => ({
    title: r.title,
    url: r.url,
    excerpt: r.excerpt,
    category: r.category,
    tags: r.tags,
  }))
}
