import { logUsageEvent } from "@/lib/usage/log"
import type { IndexingResult } from "./indexing-api"

export async function pingIndexNow(
  url: string,
  attribution: { siteId: string; postId?: string }
): Promise<IndexingResult> {
  const key = process.env.INDEXNOW_KEY
  if (!key) return { status: "skipped", error: "INDEXNOW_KEY not set" }

  const start = Date.now()
  try {
    const host = new URL(url).host
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, key, urlList: [url] }),
    })

    const ok = res.ok || res.status === 202
    const text = ok ? "" : await res.text().catch(() => "")

    await logUsageEvent({
      provider: "google",
      model: "indexnow",
      operation: "indexnow-ping",
      units: { apiCallCount: 1 },
      attribution,
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      errorMessage: ok ? undefined : `${res.status}: ${text.slice(0, 200)}`,
      metadata: { url, host },
    })

    if (!ok) return { status: "error", error: `${res.status}: ${text.slice(0, 200)}` }
    return { status: "ok" }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logUsageEvent({
      provider: "google",
      model: "indexnow",
      operation: "indexnow-ping",
      units: { apiCallCount: 1 },
      attribution,
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      errorMessage: message,
    })
    return { status: "error", error: message }
  }
}
