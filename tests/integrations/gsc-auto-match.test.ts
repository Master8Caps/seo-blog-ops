import { describe, it, expect } from "vitest"
import { scoreMatch } from "@/modules/integrations/services/gsc-auto-match"

describe("scoreMatch", () => {
  it("returns 100 for exact URL match", () => {
    expect(scoreMatch("https://example.com", "https://example.com/")).toBe(100)
  })
  it("returns 95 for sc-domain match on apex", () => {
    expect(scoreMatch("https://example.com", "sc-domain:example.com")).toBe(95)
  })
  it("returns 95 for sc-domain match ignoring www on the site URL", () => {
    expect(scoreMatch("https://www.example.com", "sc-domain:example.com")).toBe(95)
  })
  it("returns 70 for subdomain-of-property match", () => {
    expect(scoreMatch("https://blog.example.com", "sc-domain:example.com")).toBe(70)
  })
  it("returns 0 when domains differ", () => {
    expect(scoreMatch("https://example.com", "sc-domain:other.com")).toBe(0)
  })
})
