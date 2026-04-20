import { describe, it, expect } from "vitest"
import { computeCostUsd } from "@/lib/usage/pricing"

describe("computeCostUsd", () => {
  it("computes Anthropic Sonnet cost from input/output tokens", () => {
    // Sonnet 4.6: $3/MTok input, $15/MTok output → 1M+1M = $18
    const cost = computeCostUsd({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      units: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
    })
    expect(cost).toBeCloseTo(18.0, 4)
  })

  it("computes Gemini image generation cost from image count", () => {
    const cost = computeCostUsd({
      provider: "gemini",
      model: "gemini-3.1-flash-image-preview",
      units: { imageCount: 4 },
    })
    expect(cost).toBeCloseTo(0.156, 4)
  })

  it("computes StealthGPT cost from word count", () => {
    const cost = computeCostUsd({
      provider: "stealthgpt",
      model: null,
      units: { wordCount: 1000 },
    })
    // $0.20 per 1000 words = $0.0002/word × 1000 = $0.20
    expect(cost).toBeCloseTo(0.2, 4)
  })

  it("returns 0 for free-tier Jina", () => {
    const cost = computeCostUsd({
      provider: "jina",
      model: null,
      units: { apiCallCount: 1 },
    })
    expect(cost).toBe(0)
  })

  it("throws on unknown model for a metered provider", () => {
    expect(() =>
      computeCostUsd({
        provider: "anthropic",
        model: "claude-future-9000",
        units: { inputTokens: 100, outputTokens: 100 },
      })
    ).toThrow(/no pricing.*claude-future-9000/i)
  })

  it("returns 0 for DataForSEO (response-driven pricing — caller passes cost separately)", () => {
    const cost = computeCostUsd({
      provider: "dataforseo",
      model: null,
      units: { apiCallCount: 1 },
    })
    expect(cost).toBe(0)
  })
})
