const DATAFORSEO_BASE = "https://api.dataforseo.com/v3"

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN ?? ""
  const password = process.env.DATAFORSEO_PASSWORD ?? ""
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64")
}

interface DataForSEOKeyword {
  keyword: string
  search_volume: number | null
  competition: string | null
  competition_index: number | null
  cpc: number | null
  monthly_searches: Array<{
    year: number
    month: number
    search_volume: number
  }> | null
}

interface DataForSEOResponse {
  status_code: number
  status_message: string
  tasks: Array<{
    status_code: number
    status_message: string
    result: DataForSEOKeyword[] | null
  }>
}

export interface KeywordData {
  keyword: string
  searchVolume: number | null
  competition: string | null
  competitionIndex: number | null
  cpc: number | null
}

async function callDataForSEO(
  endpoint: string,
  body: unknown[]
): Promise<DataForSEOKeyword[]> {
  const response = await fetch(`${DATAFORSEO_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as DataForSEOResponse
  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO error: ${data.status_message}`)
  }

  const task = data.tasks[0]
  if (!task || task.status_code !== 20000 || !task.result) {
    throw new Error(`DataForSEO task error: ${task?.status_message ?? "No result"}`)
  }

  return task.result
}

function mapKeywords(raw: DataForSEOKeyword[]): KeywordData[] {
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

export async function getKeywordsForKeywords(
  seedKeywords: string[],
  locationCode: number = 2826,
  languageCode: string = "en"
): Promise<KeywordData[]> {
  const raw = await callDataForSEO(
    "/keywords_data/google_ads/keywords_for_keywords/live",
    [
      {
        keywords: seedKeywords.slice(0, 10),
        location_code: locationCode,
        language_code: languageCode,
        sort_by: "search_volume",
        search_partners: false,
      },
    ]
  )
  return mapKeywords(raw)
}

export async function getKeywordsForSite(
  siteUrl: string,
  locationCode: number = 2826,
  languageCode: string = "en"
): Promise<KeywordData[]> {
  const raw = await callDataForSEO(
    "/keywords_data/google_ads/keywords_for_site/live",
    [
      {
        target: new URL(siteUrl).hostname,
        location_code: locationCode,
        language_code: languageCode,
        sort_by: "search_volume",
        search_partners: false,
      },
    ]
  )
  return mapKeywords(raw)
}
