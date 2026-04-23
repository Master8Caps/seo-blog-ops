import { getSearchConsoleClient } from "../gsc-client"
import { discoverSitemap } from "../sitemap-discovery"
import { logUsageEvent } from "@/lib/usage/log"
import type { IndexingResult } from "./indexing-api"

export async function resubmitSitemap(
  input: {
    siteUrl: string
    gscProperty: string
    sitemapOverride?: string | null
  },
  attribution: { siteId: string; postId?: string }
): Promise<IndexingResult & { sitemap?: string }> {
  const start = Date.now()
  try {
    const discovered = await discoverSitemap(input)
    if (!discovered) {
      return { status: "skipped", error: "no sitemap found" }
    }

    const sc = await getSearchConsoleClient()
    await sc.sitemaps.submit({
      siteUrl: input.gscProperty,
      feedpath: discovered.url,
    })

    await logUsageEvent({
      provider: "google",
      model: "search-console-api",
      operation: "sitemap-resubmit",
      units: { apiCallCount: 1 },
      attribution,
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      metadata: { sitemap: discovered.url, source: discovered.source },
    })

    return { status: "ok", sitemap: discovered.url }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logUsageEvent({
      provider: "google",
      model: "search-console-api",
      operation: "sitemap-resubmit",
      units: { apiCallCount: 1 },
      attribution,
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      errorMessage: message,
    })
    return { status: "error", error: message }
  }
}
