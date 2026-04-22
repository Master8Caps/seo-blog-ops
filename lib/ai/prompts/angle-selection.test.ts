import { describe, it, expect } from "vitest"
import { buildAngleSelectionPrompt } from "./angle-selection"

describe("buildAngleSelectionPrompt", () => {
  it("renders angles with usage counts", () => {
    const prompt = buildAngleSelectionPrompt({
      primaryKeyword: "unicorn party ideas",
      siteNiche: "kids parties",
      recentClusterPosts: [],
      angles: [
        { id: "a1", text: "for toddlers", usageCount: 3 },
        { id: "a2", text: "DIY budget", usageCount: 0 },
      ],
    })

    expect(prompt).toContain("for toddlers")
    expect(prompt).toContain("DIY budget")
    expect(prompt).toContain("used 3 times")
    expect(prompt).toContain("used 0 times")
  })

  it("instructs preference for low usage counts", () => {
    const prompt = buildAngleSelectionPrompt({
      primaryKeyword: "x",
      siteNiche: "y",
      recentClusterPosts: [],
      angles: [{ id: "a1", text: "t", usageCount: 0 }],
    })

    expect(prompt).toMatch(/prefer.*low/i)
  })

  it("specifies the JSON response shape with angleId and reasoning", () => {
    const prompt = buildAngleSelectionPrompt({
      primaryKeyword: "x",
      siteNiche: "y",
      recentClusterPosts: [],
      angles: [{ id: "a1", text: "t", usageCount: 0 }],
    })

    expect(prompt).toContain('"angleId"')
    expect(prompt).toContain('"reasoning"')
  })
})
