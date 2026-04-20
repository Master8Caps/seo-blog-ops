import { logUsageEvent } from "./log"
import type { Attribution, Operation } from "./types"

const JINA_BASE = "https://r.jina.ai/"

export interface ReadUrlInput {
  url: string
  operation: Operation
  attribution: Attribution
  metadata?: Record<string, unknown>
}

export interface ReadUrlResult {
  text: string
  status: number
  ok: boolean
}

/**
 * Free-tier Jina Reader wrapper. Appends the target URL to r.jina.ai/ and logs a
 * zero-cost usage event per call (pricing.ts returns 0 for jina). Mirrors the
 * headers and timeout from the existing crawler so behavior is unchanged.
 */
export async function readUrl(input: ReadUrlInput): Promise<ReadUrlResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${JINA_BASE}${input.url}`, {
      headers: {
        Accept: "text/plain",
        "X-No-Cache": "true",
      },
      signal: AbortSignal.timeout(15000),
    })
    const text = await res.text()

    await logUsageEvent({
      provider: "jina",
      model: null,
      operation: input.operation,
      units: { apiCallCount: 1 },
      attribution: input.attribution,
      durationMs: Date.now() - start,
      metadata: input.metadata,
      errorMessage: res.ok ? undefined : `Jina returned HTTP ${res.status}`,
    })

    return { text, status: res.status, ok: res.ok }
  } catch (err) {
    await logUsageEvent({
      provider: "jina",
      model: null,
      operation: input.operation,
      units: { apiCallCount: 1 },
      attribution: input.attribution,
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: input.metadata,
    })
    throw err
  }
}
