import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    site: { findUnique: vi.fn() },
    gscMetricDaily: { upsert: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    gscMetricPage: { deleteMany: vi.fn(), createMany: vi.fn() },
    gscMetricQuery: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}))

vi.mock("@/lib/usage/log", () => ({ logUsageEvent: vi.fn() }))

vi.mock("@/modules/integrations/services/gsc-client", () => ({
  getSearchConsoleClient: vi.fn(),
}))

import { prisma } from "@/lib/db/prisma"
import { getSearchConsoleClient } from "@/modules/integrations/services/gsc-client"
import { syncSiteMetrics } from "@/modules/integrations/services/gsc-sync"

function mockClient(rows: Record<string, Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>>) {
  return {
    searchanalytics: {
      query: vi.fn(async ({ requestBody }: { requestBody: { dimensions?: string[] } }) => {
        const key = requestBody.dimensions?.[0] ?? "date"
        return { data: { rows: rows[key] ?? [] } }
      }),
    },
  } as never
}

describe("syncSiteMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.gscMetricDaily.count).mockResolvedValue(10)
  })

  it("skips sites without a gscProperty", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValueOnce({
      id: "s1",
      gscProperty: null,
    } as never)
    const result = await syncSiteMetrics("s1")
    expect(result.skipped).toBe(true)
    expect(result.reason).toMatch(/no.*gsc.*property/i)
    expect(getSearchConsoleClient).not.toHaveBeenCalled()
  })

  it("upserts daily rows, replaces page + query rows", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValueOnce({
      id: "s1",
      gscProperty: "sc-domain:example.com",
    } as never)
    vi.mocked(getSearchConsoleClient).mockResolvedValueOnce(
      mockClient({
        date: [{ keys: ["2026-04-22"], clicks: 5, impressions: 100, ctr: 0.05, position: 12.3 }],
        page: [{ keys: ["https://example.com/a"], clicks: 3, impressions: 50, ctr: 0.06, position: 10 }],
        query: [{ keys: ["best widgets"], clicks: 2, impressions: 30, ctr: 0.066, position: 8 }],
      })
    )

    const result = await syncSiteMetrics("s1")

    expect(result.skipped).toBe(false)
    expect(prisma.gscMetricDaily.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.gscMetricPage.deleteMany).toHaveBeenCalledWith({
      where: { siteId: "s1", window: "28d" },
    })
    expect(prisma.gscMetricPage.createMany).toHaveBeenCalledWith({
      data: [{ siteId: "s1", page: "https://example.com/a", window: "28d", clicks: 3, impressions: 50, ctr: 0.06, position: 10 }],
    })
    expect(prisma.gscMetricQuery.deleteMany).toHaveBeenCalled()
    expect(prisma.gscMetricQuery.createMany).toHaveBeenCalled()
  })

  it("backfills 90 days on first sync (no existing rows)", async () => {
    vi.mocked(prisma.gscMetricDaily.count).mockResolvedValueOnce(0)
    vi.mocked(prisma.site.findUnique).mockResolvedValueOnce({
      id: "s1",
      gscProperty: "sc-domain:example.com",
    } as never)
    const client = mockClient({
      date: Array.from({ length: 90 }, (_, i) => ({
        keys: [`2026-01-${String((i % 28) + 1).padStart(2, "0")}`],
        clicks: i,
        impressions: i * 10,
        ctr: 0.05,
        position: 10,
      })),
      page: [],
      query: [],
    })
    vi.mocked(getSearchConsoleClient).mockResolvedValueOnce(client)

    await syncSiteMetrics("s1")

    const firstCall = (client as never as { searchanalytics: { query: ReturnType<typeof vi.fn> } }).searchanalytics.query.mock.calls[0][0]
    const start = new Date(firstCall.requestBody.startDate)
    const end = new Date(firstCall.requestBody.endDate)
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBeGreaterThanOrEqual(89)
  })
})
