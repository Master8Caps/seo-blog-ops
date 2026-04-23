"use server"

import { prisma } from "@/lib/db/prisma"
import { getPostClicks28d } from "@/modules/integrations/services/get-post-clicks"

export async function getPosts(filters?: {
  siteId?: string
  status?: string
}) {
  const posts = await prisma.post.findMany({
    where: {
      ...(filters?.siteId ? { siteId: filters.siteId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      site: { select: { name: true, slug: true } },
      keyword: { select: { keyword: true } },
    },
  })

  const publishedUrls = posts
    .map((p) => p.publishedUrl)
    .filter((u): u is string => typeof u === "string" && u.length > 0)
  const clicksMap = await getPostClicks28d(publishedUrls)

  return posts.map((post) => ({
    ...post,
    clicks: post.publishedUrl ? clicksMap.get(post.publishedUrl) ?? null : null,
  }))
}

export async function getPostById(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      site: { select: { name: true, slug: true, url: true, publishType: true } },
      keyword: { select: { keyword: true } },
    },
  })
}
