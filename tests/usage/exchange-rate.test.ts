import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchUsdGbpRate, FALLBACK_USD_GBP } from "@/lib/usage/exchange-rate"

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exchangeRate: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db/prisma"

describe("fetchUsdGbpRate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("returns cached rate if today's row exists", async () => {
    vi.mocked(prisma.exchangeRate.findUnique).mockResolvedValue({
      date: new Date(),
      usdGbp: { toString: () => "0.792" } as never,
      fetchedAt: new Date(),
    } as never)

    const rate = await fetchUsdGbpRate()
    expect(rate).toBeCloseTo(0.792, 4)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("fetches from API and caches when no row exists", async () => {
    vi.mocked(prisma.exchangeRate.findUnique).mockResolvedValue(null)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { GBP: 0.788 } }),
    } as Response)

    const rate = await fetchUsdGbpRate()
    expect(rate).toBeCloseTo(0.788, 4)
    expect(global.fetch).toHaveBeenCalledOnce()
    expect(prisma.exchangeRate.upsert).toHaveBeenCalledOnce()
  })

  it("returns hardcoded fallback when API fetch fails", async () => {
    vi.mocked(prisma.exchangeRate.findUnique).mockResolvedValue(null)
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"))

    const rate = await fetchUsdGbpRate()
    expect(rate).toBe(FALLBACK_USD_GBP)
  })

  it("returns fallback when API responds with non-ok status", async () => {
    vi.mocked(prisma.exchangeRate.findUnique).mockResolvedValue(null)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 503,
    } as Response)

    const rate = await fetchUsdGbpRate()
    expect(rate).toBe(FALLBACK_USD_GBP)
  })
})
