import { prisma } from "@/lib/db/prisma"

export const FALLBACK_USD_GBP = 0.79

const EXCHANGE_API = "https://api.exchangerate.host/latest?base=USD&symbols=GBP"

interface ExchangeApiResponse {
  rates?: { GBP?: number }
}

function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function fetchUsdGbpRate(): Promise<number> {
  const today = todayUtc()

  const cached = await prisma.exchangeRate.findUnique({ where: { date: today } })
  if (cached) {
    return Number(cached.usdGbp)
  }

  let rate = FALLBACK_USD_GBP
  try {
    const res = await fetch(EXCHANGE_API)
    if (res.ok) {
      const body = (await res.json()) as ExchangeApiResponse
      const apiRate = body.rates?.GBP
      if (typeof apiRate === "number" && apiRate > 0 && apiRate < 10) {
        rate = apiRate
      } else {
        console.warn("[exchange-rate] API returned malformed rate, using fallback")
      }
    } else {
      console.warn(`[exchange-rate] API status ${res.status}, using fallback`)
    }
  } catch (err) {
    console.warn("[exchange-rate] fetch failed, using fallback:", err)
  }

  if (rate !== FALLBACK_USD_GBP) {
    await prisma.exchangeRate.upsert({
      where: { date: today },
      create: { date: today, usdGbp: rate },
      update: { usdGbp: rate, fetchedAt: new Date() },
    })
  }

  return rate
}
