"use server"

import { prisma } from "@/lib/db/prisma"

export async function getSites() {
  return prisma.site.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { posts: true, keywords: true },
      },
    },
  })
}

export async function getSiteById(id: string) {
  return prisma.site.findUnique({
    where: { id },
    include: {
      _count: {
        select: { posts: true, keywords: true },
      },
    },
  })
}

export async function getSiteBySlug(slug: string) {
  return prisma.site.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { posts: true, keywords: true },
      },
    },
  })
}
