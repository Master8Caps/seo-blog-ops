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

Select EXACTLY 15 keywords (or fewer if less than 15 available) from the list below. Each selected keyword will become a blog post. Do NOT select more than 15.

HARD RULES:
- NEVER select a keyword with relevance below 40%. No exceptions.
- Select EXACTLY 15 keywords (or all of them if fewer than 15 have relevance >= 40%).

Selection criteria (in priority order):
1. **Relevance and volume first** — strongly favour keywords with high relevance scores AND high search volume. A keyword with 60%+ relevance and high volume should almost always be selected over one with lower relevance, regardless of other factors.
2. **Quick wins** — among similarly relevant keywords, favour low competition and high CPC.
3. **Avoid cannibalisation** — don't pick keywords that are too similar (e.g. "best X" and "top X" — pick one).
4. **Topic coverage** — try to spread across clusters, but NOT at the expense of picking low-relevance keywords. Max 3 keywords per cluster.
5. **Intent mix** — primarily informational (good for blogs), but include 1-2 commercial keywords if they have strong relevance.

Available keywords:
${keywordList}

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "selected": ["keyword one", "keyword two", "keyword three"]
}`
}
