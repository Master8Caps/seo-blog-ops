import { logUsageEvent } from "./log"
import type { Attribution, Operation } from "./types"

const DATAFORSEO_BASE = "https://api.dataforseo.com/v3"

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN ?? ""
  const password = process.env.DATAFORSEO_PASSWORD ?? ""
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64")
}

interface DfsKeyword {
  keyword: string
  search_volume: number | null
  competition: string | null
  competition_index: number | null
  cpc: number | null
}

interface DfsResponse {
  status_code: number
  status_message: string
  tasks: Array<{
    status_code: number
    status_message: string
    cost: number
    result: DfsKeyword[] | null
  }>
}

export interface KeywordData {
  keyword: string
  searchVolume: number | null
  competition: string | null
  competitionIndex: number | null
  cpc: number | null
}

interface CallInput {
  endpoint: string
  body: unknown[]
  operation: Operation
  attribution: Attribution
}

async function callDfs(input: CallInput): Promise<{ result: DfsKeyword[]; costUsd: number }> {
  const start = Date.now()
  let costUsd = 0
  try {
    const res = await fetch(`${DATAFORSEO_BASE}${input.endpoint}`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(input.body),
    })
    if (!res.ok) throw new Error(`DataForSEO ${res.status} ${res.statusText}`)

    const data = (await res.json()) as DfsResponse
    if (data.status_code !== 20000) throw new Error(`DataForSEO: ${data.status_message}`)
    const task = data.tasks[0]
    if (!task || task.status_code !== 20000 || !task.result) {
      throw new Error(`DataForSEO task: ${task?.status_message ?? "no result"}`)
    }

    costUsd = task.cost ?? 0

    await logUsageEvent({
      provider: "dataforseo",
      model: null,
      operation: input.operation,
      units: { apiCallCount: 1 },
      attribution: input.attribution,
      costUsdOverride: costUsd,
      durationMs: Date.now() - start,
    })

    return { result: task.result, costUsd }
  } catch (err) {
    await logUsageEvent({
      provider: "dataforseo",
      model: null,
      operation: input.operation,
      units: { apiCallCount: 1 },
      attribution: input.attribution,
      costUsdOverride: costUsd,
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

function mapKeywords(raw: DfsKeyword[]): KeywordData[] {
  return raw
    .filter((k) => k.keyword && k.search_volume !== null && k.search_volume > 0)
    .map((k) => ({
      keyword: k.keyword,
      searchVolume: k.search_volume,
      competition: k.competition,
      competitionIndex: k.competition_index,
      cpc: k.cpc,
    }))
}

export async function keywordsForKeywords(
  seedKeywords: string[],
  attribution: Attribution,
  locationCode = 2826,
  languageCode = "en"
): Promise<KeywordData[]> {
  const { result } = await callDfs({
    endpoint: "/keywords_data/google_ads/keywords_for_keywords/live",
    body: [{
      keywords: seedKeywords.slice(0, 10),
      location_code: locationCode,
      language_code: languageCode,
      sort_by: "search_volume",
      search_partners: false,
    }],
    operation: "kw-for-keywords",
    attribution,
  })
  return mapKeywords(result)
}

export async function keywordsForSite(
  siteUrl: string,
  attribution: Attribution,
  locationCode = 2826,
  languageCode = "en"
): Promise<KeywordData[]> {
  const { result } = await callDfs({
    endpoint: "/keywords_data/google_ads/keywords_for_site/live",
    body: [{
      target: new URL(siteUrl).hostname,
      location_code: locationCode,
      language_code: languageCode,
      sort_by: "search_volume",
      search_partners: false,
    }],
    operation: "kw-for-site",
    attribution,
  })
  return mapKeywords(result)
}
