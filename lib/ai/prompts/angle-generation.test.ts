import { describe, it, expect } from "vitest"
import { buildAngleGenerationPrompt } from "./angle-generation"

describe("buildAngleGenerationPrompt", () => {
  it("includes keyword, niche, audience, and cluster in the prompt", () => {
    const prompt = buildAngleGenerationPrompt({
      keyword: "unicorn party ideas",
      siteNiche: "kids birthday parties",
      siteAudience: "parents of 3-8 year olds",
      cluster: "birthday themes",
    })

    expect(prompt).toContain("unicorn party ideas")
    expect(prompt).toContain("kids birthday parties")
    expect(prompt).toContain("parents of 3-8 year olds")
    expect(prompt).toContain("birthday themes")
  })

  it("asks Claude for 8-15 distinct angles", () => {
    const prompt = buildAngleGenerationPrompt({
      keyword: "wedding venue",
      siteNiche: "UK weddings",
      siteAudience: "engaged couples",
      cluster: null,
    })

    expect(prompt).toMatch(/8[–-]?15/)
    expect(prompt).toContain("distinct")
  })

  it("specifies the JSON response shape", () => {
    const prompt = buildAngleGenerationPrompt({
      keyword: "x",
      siteNiche: "y",
      siteAudience: "z",
      cluster: null,
    })

    expect(prompt).toContain('"angles"')
  })
})
