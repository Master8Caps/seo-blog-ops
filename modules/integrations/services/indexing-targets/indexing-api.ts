import { getAccessToken } from "@/lib/google/auth"
import { logUsageEvent } from "@/lib/usage/log"

export interface IndexingResult {
  status: "ok" | "error" | "skipped"
  error?: string
}

export async function notifyIndexingApi(
  url: string,
  attribution: { siteId: string; postId?: string }
): Promise<IndexingResult> {
  const start = Date.now()
  try {
    const token = await getAccessToken()
    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    })

    const ok = res.ok
    const text = ok ? "" : await res.text().catch(() => "")

    await logUsageEvent({
      provider: "google",
      model: "indexing-api",
      operation: "indexing-api",
      units: { apiCallCount: 1 },
      attribution,
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      errorMessage: ok ? undefined : `${res.status}: ${text.slice(0, 200)}`,
      metadata: { url },
    })

    if (!ok) return { status: "error", error: `${res.status}: ${text.slice(0, 200)}` }
    return { status: "ok" }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logUsageEvent({
      provider: "google",
      model: "indexing-api",
      operation: "indexing-api",
      units: { apiCallCount: 1 },
      attribution,
      costUsdOverride: 0,
      durationMs: Date.now() - start,
      errorMessage: message,
    })
    return { status: "error", error: message }
  }
}
