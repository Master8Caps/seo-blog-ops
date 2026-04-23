import { describe, it, expect } from "vitest"
import { normalizeUrl, extractDomain } from "@/modules/integrations/services/url-normalize"

describe("normalizeUrl", () => {
  it("lowercases the host", () => {
    expect(normalizeUrl("https://Example.COM/path")).toBe("https://example.com/path")
  })
  it("strips trailing slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com")
  })
  it("strips www. prefix", () => {
    expect(normalizeUrl("https://www.example.com")).toBe("https://example.com")
  })
  it("preserves protocol", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com")
  })
  it("collapses path consistently", () => {
    expect(normalizeUrl("https://example.com//foo//bar/")).toBe("https://example.com/foo/bar")
  })
})

describe("extractDomain", () => {
  it("returns just the apex domain without protocol/www", () => {
    expect(extractDomain("https://www.example.com/path")).toBe("example.com")
  })
  it("handles sc-domain: format", () => {
    expect(extractDomain("sc-domain:example.com")).toBe("example.com")
  })
})
