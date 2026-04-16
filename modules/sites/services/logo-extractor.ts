const FETCH_TIMEOUT_MS = 8000
const USER_AGENT =
  "Mozilla/5.0 (compatible; SEOBlogOps/1.0; +https://seo-blog-ops)"

interface IconCandidate {
  href: string
  score: number
}

function absoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function parseSizeHint(sizes: string | null): number {
  if (!sizes) return 0
  if (/any/i.test(sizes)) return 512 // SVGs often declare sizes="any"
  const match = sizes.match(/(\d+)\s*x\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : 0
}

function extractFromHead(html: string, baseUrl: string): IconCandidate[] {
  const candidates: IconCandidate[] = []

  const linkRegex = /<link\b[^>]*>/gi
  for (const tag of html.match(linkRegex) ?? []) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
    const sizes = tag.match(/\bsizes\s*=\s*["']([^"']+)["']/i)?.[1] ?? null
    const type = tag.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    if (!rel || !href) continue

    const resolved = absoluteUrl(href, baseUrl)
    if (!resolved) continue

    // SVG beats everything — crispest at any size and usually the brand mark
    if (type === "image/svg+xml" || /\.svg(\?|$)/i.test(href)) {
      candidates.push({ href: resolved, score: 1000 })
      continue
    }

    if (/\bapple-touch-icon\b/.test(rel)) {
      // Apple icons are typically 180x180, nice quality
      candidates.push({ href: resolved, score: 500 + parseSizeHint(sizes) })
      continue
    }

    if (/\b(icon|shortcut icon|mask-icon|fluid-icon)\b/.test(rel)) {
      candidates.push({ href: resolved, score: 200 + parseSizeHint(sizes) })
    }
  }

  // og:image / twitter:image as a last resort (often a full social card, not ideal,
  // but beats the Globe fallback for a brand-new site with no favicon)
  const ogMatch = html.match(
    /<meta\b[^>]*\bproperty\s*=\s*["']og:image["'][^>]*>/i
  )
  if (ogMatch) {
    const href = ogMatch[0].match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]
    if (href) {
      const resolved = absoluteUrl(href, baseUrl)
      if (resolved) candidates.push({ href: resolved, score: 50 })
    }
  }

  return candidates
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Fetches the homepage HTML and returns the best logo URL it can find.
 * Falls back to /favicon.svg and /favicon.ico. Returns null if nothing resolves.
 */
export async function extractLogoUrl(siteUrl: string): Promise<string | null> {
  let html: string
  try {
    const res = await fetch(siteUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    })
    if (!res.ok) return null
    html = await res.text()
  } catch {
    return null
  }

  // Limit to <head> to keep regex work small
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)
  const searchSpace = headMatch ? headMatch[1] : html.slice(0, 50_000)

  const candidates = extractFromHead(searchSpace, siteUrl)

  if (candidates.length === 0) {
    // Try the conventional fallbacks
    const svgFallback = absoluteUrl("/favicon.svg", siteUrl)
    const icoFallback = absoluteUrl("/favicon.ico", siteUrl)
    if (svgFallback && (await headOk(svgFallback))) return svgFallback
    if (icoFallback && (await headOk(icoFallback))) return icoFallback
    return null
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].href
}
