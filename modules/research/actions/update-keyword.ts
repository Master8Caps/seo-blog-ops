"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"

export async function updateKeywordStatus(
  keywordId: string,
  status: "discovered" | "approved" | "used" | "rejected"
) {
  const keyword = await prisma.keyword.update({
    where: { id: keywordId },
    data: { status },
    include: { site: { select: { slug: true } } },
  })
  revalidatePath(`/sites/${keyword.site.slug}/research`)
  return keyword
}

export async function bulkUpdateKeywordStatus(
  keywordIds: string[],
  status: "discovered" | "approved" | "used" | "rejected"
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

  if (first) {
    revalidatePath(`/sites/${first.site.slug}/research`)
  }
}
