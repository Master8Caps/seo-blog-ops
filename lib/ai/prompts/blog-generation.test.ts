import { describe, it, expect } from "vitest"
import { buildBlogGenerationPrompt, buildKeywordGroupSelectionPrompt } from "./blog-generation"

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

describe("buildBlogGenerationPrompt with angle + differentiation", () => {
  const baseInput = {
    siteNiche: "n",
    siteAudience: "a",
    siteTone: "t",
    siteTopics: ["topic"],
    primaryKeyword: { id: "k1", keyword: "kw", searchVolume: 100, intent: "informational", cluster: "c1" },
    secondaryKeywords: [],
    existingPosts: [],
  }

  it("includes the assigned angle when selectedAngle is provided", () => {
    const prompt = buildBlogGenerationPrompt({
      ...baseInput,
      selectedAngle: { id: "a1", text: "for beginners" },
      recentClusterPosts: [],
    })

    expect(prompt).toContain("Assigned angle")
    expect(prompt).toContain("for beginners")
  })

  it("omits the assigned angle block when selectedAngle is null", () => {
    const prompt = buildBlogGenerationPrompt({
      ...baseInput,
      selectedAngle: null,
      recentClusterPosts: [],
    })

    expect(prompt).not.toContain("Assigned angle")
  })

  it("lists recent cluster posts for differentiation", () => {
    const prompt = buildBlogGenerationPrompt({
      ...baseInput,
      selectedAngle: null,
      recentClusterPosts: [
        { title: "Old Post", excerpt: "Summary", angle: "for pros" },
      ],
    })

    expect(prompt).toContain("Old Post")
    expect(prompt).toContain("for pros")
  })

  it("describes the cluster_exhausted escape hatch in the output schema", () => {
    const prompt = buildBlogGenerationPrompt({
      ...baseInput,
      selectedAngle: null,
      recentClusterPosts: [],
    })

    expect(prompt).toContain("cluster_exhausted")
    expect(prompt).toContain('"status"')
  })
})
