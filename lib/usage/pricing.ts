import type { Provider, UsageUnits } from "./types"

interface AnthropicModelPricing {
  inputPerMTok: number
  outputPerMTok: number
}

interface GeminiModelPricing {
  perImage: number
}

export const PRICING = {
  anthropic: {
    "claude-sonnet-4-6": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
    "claude-sonnet-4-20250514": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
    "claude-opus-4-7": { inputPerMTok: 15.0, outputPerMTok: 75.0 },
    "claude-haiku-4-5-20251001": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  } as Record<string, AnthropicModelPricing>,
  gemini: {
    "gemini-3.1-flash-image-preview": { perImage: 0.039 },
  } as Record<string, GeminiModelPricing>,
  stealthgpt: { perWord: 0.0000285 },
  jina: { perCall: 0.0 },
} as const

export interface ComputeCostInput {
  provider: Provider
  model: string | null
  units: UsageUnits
}

export function computeCostUsd(input: ComputeCostInput): number {
  const { provider, model, units } = input

  switch (provider) {
    case "anthropic": {
      if (!model) throw new Error("anthropic requires a model")
      const pricing = PRICING.anthropic[model]
      if (!pricing) {
        throw new Error(`No pricing for ${model} — add to lib/usage/pricing.ts`)
      }
      const inTok = units.inputTokens ?? 0
      const outTok = units.outputTokens ?? 0
      return (inTok / 1_000_000) * pricing.inputPerMTok +
             (outTok / 1_000_000) * pricing.outputPerMTok
    }

    case "gemini": {
      if (!model) throw new Error("gemini requires a model")
      const pricing = PRICING.gemini[model]
      if (!pricing) {
        throw new Error(`No pricing for ${model} — add to lib/usage/pricing.ts`)
      }
      return (units.imageCount ?? 0) * pricing.perImage
    }

    case "stealthgpt":
      return (units.wordCount ?? 0) * PRICING.stealthgpt.perWord

    case "jina":
      return (units.apiCallCount ?? 0) * PRICING.jina.perCall

    case "dataforseo":
      // DataForSEO returns cost directly in the API response.
      // The wrapper passes that value through to logUsageEvent.costUsdOverride.
      return 0

    default: {
      const _exhaustive: never = provider
      throw new Error(`Unknown provider: ${_exhaustive}`)
    }
  }
}
