"use server"

import { prisma } from "@/lib/db/prisma"

/**
 * Returns the number of cached external posts for a site.
 * Used by the Publishing tab to show the "Cached posts: N" counter.
 */
export async function getExternalPostCount(siteId: string): Promise<number> {
  if (!siteId) return 0
  return prisma.externalPost.count({ where: { siteId } })
}
