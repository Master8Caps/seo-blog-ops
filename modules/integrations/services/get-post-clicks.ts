import { prisma } from "@/lib/db/prisma"

export async function getPostClicks28d(
  publishedUrls: string[]
): Promise<Map<string, number>> {
  if (publishedUrls.length === 0) return new Map()
  const rows = await prisma.gscMetricPage.findMany({
    where: {
      window: "28d",
      page: { in: publishedUrls },
    },
    select: { page: true, clicks: true },
  })
  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(r.page, (map.get(r.page) ?? 0) + r.clicks)
  }
  return map
}
