import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    post: { findUnique: vi.fn() },
    indexingLog: { create: vi.fn() },
  },
}))

vi.mock("@/modules/integrations/services/indexing-targets/indexing-api", () => ({
  notifyIndexingApi: vi.fn(),
}))
vi.mock("@/modules/integrations/services/indexing-targets/sitemap-resubmit", () => ({
  resubmitSitemap: vi.fn(),
}))
vi.mock("@/modules/integrations/services/indexing-targets/indexnow", () => ({
  pingIndexNow: vi.fn(),
}))

import { prisma } from "@/lib/db/prisma"
import { notifyIndexingApi } from "@/modules/integrations/services/indexing-targets/indexing-api"
import { resubmitSitemap } from "@/modules/integrations/services/indexing-targets/sitemap-resubmit"
import { pingIndexNow } from "@/modules/integrations/services/indexing-targets/indexnow"
import { indexPublishedPost } from "@/modules/integrations/services/indexing"

describe("indexPublishedPost", () => {
  beforeEach(() => vi.clearAllMocks())

  it("no-ops when post has no publishedUrl", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValueOnce({
      id: "p1",
      publishedUrl: null,
      site: { id: "s1", url: "https://example.com", gscProperty: "sc-domain:example.com", sitemapUrl: null, indexNowVerified: true },
    } as never)
    const result = await indexPublishedPost("p1")
    expect(result.skipped).toBe(true)
    expect(notifyIndexingApi).not.toHaveBeenCalled()
  })

  it("skips all targets when site has no gscProperty", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValueOnce({
      id: "p1",
      publishedUrl: "https://example.com/a",
      site: { id: "s1", url: "https://example.com", gscProperty: null, sitemapUrl: null, indexNowVerified: false },
    } as never)
    const result = await indexPublishedPost("p1")
    expect(result.skipped).toBe(true)
    expect(notifyIndexingApi).not.toHaveBeenCalled()
  })

  it("fires all 3 targets in parallel and logs each result", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValueOnce({
      id: "p1",
      publishedUrl: "https://example.com/a",
      site: { id: "s1", url: "https://example.com", gscProperty: "sc-domain:example.com", sitemapUrl: null, indexNowVerified: true },
    } as never)
    vi.mocked(notifyIndexingApi).mockResolvedValueOnce({ status: "ok" })
    vi.mocked(resubmitSitemap).mockResolvedValueOnce({ status: "ok", sitemap: "https://example.com/sitemap.xml" })
    vi.mocked(pingIndexNow).mockResolvedValueOnce({ status: "ok" })

    const result = await indexPublishedPost("p1")

    expect(result.skipped).toBe(false)
    expect(notifyIndexingApi).toHaveBeenCalledWith("https://example.com/a", { siteId: "s1", postId: "p1" })
    expect(resubmitSitemap).toHaveBeenCalled()
    expect(pingIndexNow).toHaveBeenCalledWith("https://example.com/a", { siteId: "s1", postId: "p1" })
    expect(prisma.indexingLog.create).toHaveBeenCalledTimes(3)
  })

  it("skips IndexNow when site is not verified", async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValueOnce({
      id: "p1",
      publishedUrl: "https://example.com/a",
      site: { id: "s1", url: "https://example.com", gscProperty: "sc-domain:example.com", sitemapUrl: null, indexNowVerified: false },
    } as never)
    vi.mocked(notifyIndexingApi).mockResolvedValueOnce({ status: "ok" })
    vi.mocked(resubmitSitemap).mockResolvedValueOnce({ status: "ok" })

    await indexPublishedPost("p1")

    expect(pingIndexNow).not.toHaveBeenCalled()
    const calls = vi.mocked(prisma.indexingLog.create).mock.calls
    const targets = calls.map((c) => (c[0].data as { target: string }).target)
    expect(targets).toContain("indexnow")
  })
})
