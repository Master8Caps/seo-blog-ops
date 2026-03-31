"use server"

import { prisma } from "@/lib/db/prisma"

export async function getKeywordsForSiteId(
  siteId: string,
  status?: string
) {
  return prisma.keyword.findMany({
    where: {
      siteId,
      ...(status ? { status } : {}),
    },
    orderBy: [
      { relevanceScore: "desc" },
      { searchVolume: "desc" },
    ],
  })
}

export async function getKeywordStats(siteId: string) {
  const [total, approved, discovered] = await Promise.all([
    prisma.keyword.count({ where: { siteId } }),
    prisma.keyword.count({ where: { siteId, status: "approved" } }),
    prisma.keyword.count({ where: { siteId, status: "discovered" } }),
  ])
  return { total, approved, discovered }
}
