export interface AngleGenerationInput {
  keyword: string
  siteNiche: string
  siteAudience: string
  cluster: string | null
}

export interface AngleGenerationResult {
  angles: string[]
}

export function buildAngleGenerationPrompt(input: AngleGenerationInput): string {
  return `You are an SEO content strategist generating sub-angles for a blog keyword.

Keyword: "${input.keyword}"
Site niche: ${input.siteNiche}
Target audience: ${input.siteAudience}
Topic cluster: ${input.cluster ?? "general"}

Generate between 8–15 genuinely distinct angles for this keyword. Each angle is a short phrase (3-8 words) describing a specific frame for a blog post — a different reader segment, format, scope, or perspective.

Rules for a good angle set:
- Vary reader segment (beginner vs advanced, budget vs premium, specific life stage)
- Vary format (tutorial, listicle, comparison, opinion, case study, checklist)
- Vary scope (quick-start, deep dive, edge case, common mistakes, FAQ)
- Each angle must produce a materially different blog post — no near-duplicates
- Ground every angle in the site's niche and audience

Examples of distinct angles for "meal planning":
- "for picky toddlers"
- "on a £20/week budget"
- "batch cooking for shift workers"
- "diabetes-friendly 7-day plan"
- "common mistakes that waste food"
- "decision-fatigue hacks"

How many angles depends on the keyword's natural breadth. Narrow keywords yield 8; broad keywords yield 15. Use your judgement.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "angles": ["angle one", "angle two", "angle three"]
}`
}
