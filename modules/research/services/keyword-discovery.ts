import {
  keywordsForKeywords,
  keywordsForSite,
  type KeywordData,
} from "@/lib/usage/dataforseo"

export interface DiscoveryInput {
  siteId: string
  siteUrl: string
  seedKeywords: string[]
  locationCode: number
}

export interface DiscoveryResult {
  keywords: KeywordData[]
  errors: string[]
}

export async function discoverKeywords(
  input: DiscoveryInput
): Promise<DiscoveryResult> {
  const errors: string[] = []
  const keywordMap = new Map<string, KeywordData>()
  const attribution = { siteId: input.siteId, researchRunId: undefined }

  if (input.seedKeywords.length > 0) {
    try {
      const results = await keywordsForKeywords(
        input.seedKeywords,
        attribution,
        input.locationCode
      )
      for (const kw of results) {
        keywordMap.set(kw.keyword.toLowerCase(), kw)
      }
    } catch (e) {
      errors.push(
        `Keywords for keywords failed: ${e instanceof Error ? e.message : "Unknown error"}`
      )
    }
  }

  try {
    const results = await keywordsForSite(
      input.siteUrl,
      attribution,
      input.locationCode
    )
    for (const kw of results) {
      if (!keywordMap.has(kw.keyword.toLowerCase())) {
        keywordMap.set(kw.keyword.toLowerCase(), kw)
      }
    }
  } catch (e) {
    errors.push(
      `Keywords for site failed: ${e instanceof Error ? e.message : "Unknown error"}`
    )
  }

  return {
    keywords: Array.from(keywordMap.values()),
    errors,
  }
}
