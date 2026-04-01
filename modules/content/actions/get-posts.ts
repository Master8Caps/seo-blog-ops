"use server"

import { prisma } from "@/lib/db/prisma"

export async function getPosts(filters?: {
  siteId?: string
  status?: string
}) {
  return prisma.post.findMany({
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
}

export async function getPostById(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      site: { select: { name: true, slug: true, url: true } },
      keyword: { select: { keyword: true } },
    },
  })
}
