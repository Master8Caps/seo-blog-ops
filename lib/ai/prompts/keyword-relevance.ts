export interface RelevanceScoringInput {
  siteNiche: string
  siteAudience: string
  siteTopics: string[]
  keywords: string[]
}

export interface RelevanceScoringResult {
  scores: Array<{
    keyword: string
    relevance: number
    intent: string
    cluster: string
  }>
}

export function buildRelevanceScoringPrompt(input: RelevanceScoringInput): string {
  return `You are an SEO specialist scoring keyword relevance for a specific website.

Site niche: ${input.siteNiche}
Target audience: ${input.siteAudience}
Core topics: ${input.siteTopics.join(", ")}

Score each keyword below on a scale of 0.0 to 1.0 for how relevant it is to this site. Also classify the search intent and assign a topic cluster.

Keywords to score:
${input.keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "scores": [
    {
      "keyword": "the keyword",
      "relevance": 0.85,
      "intent": "informational|transactional|navigational|commercial",
      "cluster": "topic cluster name"
    }
  ]
}

Relevance guidelines:
- 0.8-1.0: Directly related to the site's core services/topics
- 0.5-0.7: Related to the industry but not core offerings
- 0.2-0.4: Tangentially related
- 0.0-0.1: Not relevant`
}
