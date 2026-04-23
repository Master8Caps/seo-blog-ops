import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/modules/integrations/services/gsc-client", () => ({
  getSearchConsoleClient: vi.fn(),
}))

import { getSearchConsoleClient } from "@/modules/integrations/services/gsc-client"
import { discoverSitemap } from "@/modules/integrations/services/sitemap-discovery"

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

describe("discoverSitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
  })

  it("returns the explicit override if set", async () => {
    const result = await discoverSitemap({
      siteUrl: "https://example.com",
      gscProperty: "sc-domain:example.com",
      sitemapOverride: "https://example.com/custom-sitemap.xml",
    })
    expect(result).toEqual({ url: "https://example.com/custom-sitemap.xml", source: "override" })
    expect(getSearchConsoleClient).not.toHaveBeenCalled()
  })

  it("returns the first sitemap registered in GSC", async () => {
    vi.mocked(getSearchConsoleClient).mockResolvedValueOnce({
      sitemaps: { list: vi.fn().mockResolvedValue({ data: { sitemap: [{ path: "https://example.com/sitemap.xml" }] } }) },
    } as never)
    const result = await discoverSitemap({ siteUrl: "https://example.com", gscProperty: "sc-domain:example.com" })
    expect(result).toEqual({ url: "https://example.com/sitemap.xml", source: "gsc" })
  })

  it("falls back to /sitemap.xml when GSC has none and HEAD returns 200", async () => {
    vi.mocked(getSearchConsoleClient).mockResolvedValueOnce({
      sitemaps: { list: vi.fn().mockResolvedValue({ data: { sitemap: [] } }) },
    } as never)
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
    const result = await discoverSitemap({ siteUrl: "https://example.com", gscProperty: "sc-domain:example.com" })
    expect(result).toEqual({ url: "https://example.com/sitemap.xml", source: "guess" })
  })

  it("returns null when nothing discoverable", async () => {
    vi.mocked(getSearchConsoleClient).mockResolvedValueOnce({
      sitemaps: { list: vi.fn().mockResolvedValue({ data: { sitemap: [] } }) },
    } as never)
    fetchMock.mockResolvedValue({ ok: false, status: 404 })
    const result = await discoverSitemap({ siteUrl: "https://example.com", gscProperty: "sc-domain:example.com" })
    expect(result).toBeNull()
  })
})
