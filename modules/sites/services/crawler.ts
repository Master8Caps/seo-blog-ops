import { readUrl } from "@/lib/usage/jina"
import type { CrawledPage, CrawlResult } from "../types"

const MAX_PAGES = 10
const MAX_CONTENT_LENGTH = 5000 // per page, in characters

function extractTitle(text: string): string {
  const match = text.match(/^Title:\s*(.+)$/m)
  return match ? match[1].trim() : "Untitled"
}

function extractLinks(text: string, baseUrl: string): string[] {
  const links: string[] = []
  const regex = /https?:\/\/[^\s\])>"']+/g
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      const url = new URL(match[0])
      if (
        url.origin === new URL(baseUrl).origin &&
        !url.hash &&
        !url.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|xml|txt|webp)$/i)
      ) {
        links.push(url.origin + url.pathname)
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return [...new Set(links)]
}

async function fetchRenderedPage(
  url: string,
  siteId: string | undefined
): Promise<{ content: string | null; error?: string }> {
  try {
    const res = await readUrl({
      url,
      operation: "crawl",
      attribution: { siteId },
    })
    if (!res.ok) {
      return { content: null, error: `Jina returned HTTP ${res.status}` }
    }
    if (!res.text || res.text.length < 20) {
      return { content: null, error: "Empty response from renderer" }
    }
    return { content: res.text }
  } catch (e) {
    return { content: null, error: e instanceof Error ? e.message : "Unknown fetch error" }
  }
}

export async function crawlSite(url: string, siteId?: string): Promise<CrawlResult> {
  const visited = new Set<string>()
  const pages: CrawledPage[] = []
  const errors: string[] = []
  const queue: string[] = [url]

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const currentUrl = queue.shift()
    if (!currentUrl) break

    const normalizedUrl = currentUrl.replace(/\/+$/, "")
    if (visited.has(normalizedUrl)) continue
    visited.add(normalizedUrl)

    const result = await fetchRenderedPage(normalizedUrl, siteId)
    if (!result.content) {
      errors.push(`Failed to fetch ${normalizedUrl}: ${result.error ?? "unknown"}`)
      continue
    }

    const title = extractTitle(result.content)
    const content = result.content.slice(0, MAX_CONTENT_LENGTH)

    pages.push({ url: normalizedUrl, title, content })

    // Extract internal links from the first page only (homepage gives us site structure)
    if (pages.length === 1) {
      const links = extractLinks(result.content, normalizedUrl)
      for (const link of links) {
        if (!visited.has(link.replace(/\/+$/, "")) && queue.length < MAX_PAGES) {
          queue.push(link)
        }
      }
    }
  }

  return { pages, errors }
}
