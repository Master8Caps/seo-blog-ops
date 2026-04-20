import { prisma } from "@/lib/db/prisma"
import { fetchPublishedPosts as fetchWpPosts } from "./wordpress"
import { fetchPublishedPosts as fetchStdPosts } from "./standard-api"
import type { ExternalPostData } from "./wordpress"

export interface SyncResult {
  ok: boolean
  count: number
  error?: string
}

/**
 * Dedupe by externalId, last-write-wins. Preserves order of first occurrence.
 * Pure function — exported for unit testing.
 */
export function mergePostsForUpsert(posts: ExternalPostData[]): ExternalPostData[] {
  const map = new Map<string, ExternalPostData>()
  const order: string[] = []
  for (const p of posts) {
    if (!map.has(p.externalId)) order.push(p.externalId)
    map.set(p.externalId, p)
  }
  return order.map((id) => map.get(id)!)
}

interface SiteWithPublishConfig {
  id: string
  publishType: string | null
  publishConfig: unknown
}

/**
 * Sync the full list of published posts for a site into external_posts.
 * Routes by site.publishType. Upserts each row.
 *
 * NOTE: site.publishConfig may be encrypted JSON in the DB. The CALLER must pass
 * a decrypted config (e.g. via the same helper connect-site.ts uses). This function
 * does not decrypt.
 *
 * Expected decrypted publishConfig shape:
 * - wordpress: { siteUrl, username, appPassword }
 * - api:       { siteUrl, apiKey }
 *
 * The caller is responsible for mapping stored field names (wpUsername,
 * wpAppPassword, etc.) and merging site.url into siteUrl before calling.
 */
export async function syncExternalPosts(site: SiteWithPublishConfig): Promise<SyncResult> {
  if (!site.publishType || !site.publishConfig) {
    return { ok: false, count: 0, error: "Site has no publishing connection" }
  }

  let posts: ExternalPostData[]
  try {
    if (site.publishType === "wordpress") {
      // WP adapter takes a config object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = site.publishConfig as any
      posts = await fetchWpPosts({
        siteUrl: cfg.siteUrl,
        username: cfg.username,
        appPassword: cfg.appPassword,
      })
    } else if (site.publishType === "api") {
      // Standard API adapter takes positional args
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = site.publishConfig as any
      posts = await fetchStdPosts(cfg.siteUrl ?? cfg.apiBase, cfg.apiKey)
    } else {
      return { ok: false, count: 0, error: `Unknown publishType: ${site.publishType}` }
    }
  } catch (err) {
    return {
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const merged = mergePostsForUpsert(posts)

  for (const p of merged) {
    await prisma.externalPost.upsert({
      where: { siteId_externalId: { siteId: site.id, externalId: p.externalId } },
      create: {
        siteId: site.id,
        externalId: p.externalId,
        slug: p.slug,
        title: p.title,
        url: p.url,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags,
        publishedAt: p.publishedAt,
        source: "sync",
      },
      update: {
        slug: p.slug,
        title: p.title,
        url: p.url,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags,
        publishedAt: p.publishedAt,
        syncedAt: new Date(),
        source: "sync",
      },
    })
  }

  return { ok: true, count: merged.length }
}
