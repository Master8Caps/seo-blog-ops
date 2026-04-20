import { logUsageEvent } from "./log"
import type { Attribution, Operation } from "./types"

const STEALTHGPT_ENDPOINT = "https://stealthgpt.ai/api/stealthify"

export interface HumanizeInput {
  text: string
  operation: Operation
  attribution: Attribution
  metadata?: Record<string, unknown>
}

export interface HumanizeResult {
  humanized: string
  wordCount: number
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Humanize text via StealthGPT and log a usage_events row with wordCount.
 * Word count is measured on the input — StealthGPT is billed per input word
 * regardless of output length.
 *
 * Contract mirrored from modules/content/services/humanizer.ts:
 * - Endpoint: https://stealthgpt.ai/api/stealthify
 * - Auth header: `api-token` from STEALTHGPT_API_TOKEN env var
 * - Body: { prompt, rephrase: true, tone: "College", qualityMode: "quality" }
 * - Response: { result: string }
 */
export async function humanize(input: HumanizeInput): Promise<HumanizeResult> {
  const start = Date.now()
  const wordCount = countWords(input.text)

  try {
    const res = await fetch(STEALTHGPT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-token": process.env.STEALTHGPT_API_TOKEN ?? "",
      },
      body: JSON.stringify({
        prompt: input.text,
        rephrase: true,
        tone: "College",
        qualityMode: "quality",
      }),
    })

    if (!res.ok) {
      throw new Error(`StealthGPT ${res.status}: ${await res.text()}`)
    }

    const body = (await res.json()) as { result?: string }
    const humanized = body.result ?? ""

    await logUsageEvent({
      provider: "stealthgpt",
      model: null,
      operation: input.operation,
      units: { wordCount },
      attribution: input.attribution,
      durationMs: Date.now() - start,
      metadata: input.metadata,
    })

    return { humanized, wordCount }
  } catch (err) {
    await logUsageEvent({
      provider: "stealthgpt",
      model: null,
      operation: input.operation,
      units: { wordCount },
      attribution: input.attribution,
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: input.metadata,
    })
    throw err
  }
}
