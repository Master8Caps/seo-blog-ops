import { describe, it, expect } from "vitest"
import { buildKeywordGroupSelectionPrompt } from "./blog-generation"

describe("buildKeywordGroupSelectionPrompt with recency", () => {
  const baseInput = {
    siteNiche: "test",
    siteAudience: "test",
    keywords: [
      { keyword: "alpha", searchVolume: 100, intent: null, cluster: "x" },
    ],
  }

  it("lists recent keywords and clusters when provided", () => {
    const prompt = buildKeywordGroupSelectionPrompt({
      ...baseInput,
      recentKeywords: ["recent one", "recent two"],
      recentClusters: ["cluster-a"],
    })

    expect(prompt).toContain("recent one")
    expect(prompt).toContain("recent two")
    expect(prompt).toContain("cluster-a")
    expect(prompt).toContain("DO NOT pick a primary keyword from the \"recently used\" list")
  })

  it("handles empty recency gracefully", () => {
    const prompt = buildKeywordGroupSelectionPrompt({
      ...baseInput,
      recentKeywords: [],
      recentClusters: [],
    })

    expect(prompt).toContain("fresh site")
  })

  it("clarifies that secondary keywords may overlap with recent", () => {
    const prompt = buildKeywordGroupSelectionPrompt({
      ...baseInput,
      recentKeywords: ["x"],
      recentClusters: [],
    })

    expect(prompt).toMatch(/secondary keywords may overlap/i)
  })
})
