import type { CrawledPage, CrawlResult } from "../types"

const MAX_PAGES = 10
const MAX_DEPTH = 1
const MAX_CONTENT_LENGTH = 5000 // per page, in characters

function extractTextContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONTENT_LENGTH)
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i)
  return match ? match[1].trim() : "Untitled"
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links: string[] = []
  const regex = /href=["']([^"']+)["']/gi
  let match

  while ((match = regex.exec(html)) !== null) {
    const href = match[1]
    try {
      const resolved = new URL(href, baseUrl)
      if (
        resolved.origin === new URL(baseUrl).origin &&
        !resolved.hash &&
        !resolved.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|xml|txt)$/i)
      ) {
        links.push(resolved.origin + resolved.pathname)
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return [...new Set(links)]
}

async function fetchPage(url: string): Promise<{ html: string | null; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    })
    if (!response.ok) {
      return { html: null, error: `HTTP ${response.status} ${response.statusText}` }
    }
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("text/html")) {
      return { html: null, error: `Wrong content-type: ${contentType}` }
    }
    return { html: await response.text() }
  } catch (e) {
    return { html: null, error: e instanceof Error ? e.message : "Unknown fetch error" }
  }
}

export async function crawlSite(url: string): Promise<CrawlResult> {
  const visited = new Set<string>()
  const pages: CrawledPage[] = []
  const errors: string[] = []
  const queue: Array<{ url: string; depth: number }> = [{ url, depth: 0 }]

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const item = queue.shift()
    if (!item) break

    const normalizedUrl = item.url.replace(/\/+$/, "")
    if (visited.has(normalizedUrl)) continue
    visited.add(normalizedUrl)

    const result = await fetchPage(normalizedUrl)
    if (!result.html) {
      errors.push(`Failed to fetch ${normalizedUrl}: ${result.error ?? "unknown"}`)
      continue
    }
    const html = result.html

    const title = extractTitle(html)
    const content = extractTextContent(html)

    if (content.length > 50) {
      pages.push({ url: normalizedUrl, title, content })
    }

    if (item.depth < MAX_DEPTH) {
      const links = extractInternalLinks(html, normalizedUrl)
      for (const link of links) {
        if (!visited.has(link.replace(/\/+$/, "")) && pages.length + queue.length < MAX_PAGES * 2) {
          queue.push({ url: link, depth: item.depth + 1 })
        }
      }
    }
  }

  return { pages, errors }
}
