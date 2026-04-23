import { prisma } from "@/lib/db/prisma"
import { notifyIndexingApi } from "./indexing-targets/indexing-api"
import { resubmitSitemap } from "./indexing-targets/sitemap-resubmit"
import { pingIndexNow } from "./indexing-targets/indexnow"

export interface IndexingPipelineResult {
  skipped: boolean
  reason?: string
  results?: Array<{ target: string; status: string; error?: string }>
}

export async function indexPublishedPost(postId: string): Promise<IndexingPipelineResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      site: {
        select: {
          id: true,
          url: true,
          gscProperty: true,
          sitemapUrl: true,
          indexNowVerified: true,
        },
      },
    },
  })

  if (!post) return { skipped: true, reason: "post not found" }
  if (!post.publishedUrl) return { skipped: true, reason: "post has no publishedUrl" }
  if (!post.site.gscProperty) {
    return { skipped: true, reason: "site has no GSC property linked" }
  }

  const url = post.publishedUrl
  const attribution = { siteId: post.site.id, postId: post.id }

  const [indexingApiRes, sitemapRes, indexNowRes] = await Promise.all([
    notifyIndexingApi(url, attribution),
    resubmitSitemap(
      {
        siteUrl: post.site.url,
        gscProperty: post.site.gscProperty,
        sitemapOverride: post.site.sitemapUrl,
      },
      attribution
    ),
    post.site.indexNowVerified
      ? pingIndexNow(url, attribution)
      : Promise.resolve({ status: "skipped" as const, error: "IndexNow not verified for site" }),
  ])

  const results = [
    { target: "indexing_api", ...indexingApiRes },
    { target: "sitemap_resubmit", ...sitemapRes },
    { target: "indexnow", ...indexNowRes },
  ]

  for (const r of results) {
    await prisma.indexingLog.create({
      data: {
        postId,
        siteId: post.site.id,
        url,
        target: r.target,
        status: r.status,
        error: r.error,
      },
    })
  }

  return { skipped: false, results }
}
