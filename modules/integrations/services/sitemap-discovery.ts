import { getSearchConsoleClient } from "./gsc-client"

export interface DiscoverInput {
  siteUrl: string
  gscProperty: string
  sitemapOverride?: string | null
}

export interface DiscoverResult {
  url: string
  source: "override" | "gsc" | "guess"
}

const FALLBACK_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"]

export async function discoverSitemap(input: DiscoverInput): Promise<DiscoverResult | null> {
  if (input.sitemapOverride) {
    return { url: input.sitemapOverride, source: "override" }
  }

  try {
    const sc = await getSearchConsoleClient()
    const { data } = await sc.sitemaps.list({ siteUrl: input.gscProperty })
    const first = data.sitemap?.[0]?.path
    if (first) return { url: first, source: "gsc" }
  } catch (err) {
    console.error("[sitemap-discovery] GSC list failed, falling through to guesses:", err)
  }

  const origin = new URL(input.siteUrl).origin
  for (const path of FALLBACK_PATHS) {
    const candidate = `${origin}${path}`
    try {
      const res = await fetch(candidate, { method: "HEAD" })
      if (res.ok) return { url: candidate, source: "guess" }
    } catch {}
  }

  return null
}
