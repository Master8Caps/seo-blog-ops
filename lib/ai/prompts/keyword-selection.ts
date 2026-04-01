export interface KeywordSelectionInput {
  siteNiche: string
  siteAudience: string
  siteTone: string
  siteTopics: string[]
  keywords: Array<{
    keyword: string
    searchVolume: number | null
    cpc: number | null
    competition: string | null
    relevanceScore: number | null
    intent: string | null
    cluster: string | null
  }>
}

export interface KeywordSelectionResult {
  selected: string[]
}

export function buildKeywordSelectionPrompt(input: KeywordSelectionInput): string {
  const keywordList = input.keywords
    .map(
      (k, i) =>
        `${i + 1}. "${k.keyword}" | volume: ${k.searchVolume ?? "?"} | CPC: $${k.cpc?.toFixed(2) ?? "?"} | competition: ${k.competition ?? "?"} | relevance: ${k.relevanceScore != null ? (k.relevanceScore * 100).toFixed(0) + "%" : "?"} | intent: ${k.intent ?? "?"} | cluster: ${k.cluster ?? "?"}`
    )
    .join("\n")

  return `You are an SEO strategist selecting the best keywords for a blog content pipeline.

Site niche: ${input.siteNiche}
Target audience: ${input.siteAudience}
Tone: ${input.siteTone}
Core topics: ${input.siteTopics.join(", ")}

Select the best 15 keywords (or fewer if less than 15 available) from the list below. Each selected keyword will become a blog post.

Selection criteria (in priority order):
1. **Topic coverage** — spread across different clusters. Max 3 keywords per cluster.
2. **Quick wins** — favour keywords with high relevance, low competition, and decent search volume.
3. **Intent mix** — primarily informational keywords (good for blog content), but include 2-3 commercial keywords if available.
4. **Avoid cannibalisation** — don't pick keywords that are too similar to each other (e.g. "best X" and "top X" — pick one).

Available keywords:
${keywordList}

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "selected": ["keyword one", "keyword two", "keyword three"]
}`
}
