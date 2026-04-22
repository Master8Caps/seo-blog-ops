export interface AngleWithCount {
  id: string
  text: string
  usageCount: number
}

export interface AngleSelectionInput {
  primaryKeyword: string
  siteNiche: string
  recentClusterPosts: Array<{
    title: string
    excerpt: string | null
    angle: string | null
  }>
  angles: AngleWithCount[]
}

export interface AngleSelectionResult {
  angleId: string
  reasoning: string
}

export function buildAngleSelectionPrompt(input: AngleSelectionInput): string {
  const recentList =
    input.recentClusterPosts.length === 0
      ? "(none — nothing in this cluster yet)"
      : input.recentClusterPosts
          .map(
            (p, i) =>
              `${i + 1}. "${p.title}"${p.angle ? ` — angle: "${p.angle}"` : ""}${p.excerpt ? `\n   Excerpt: ${p.excerpt}` : ""}`
          )
          .join("\n")

  const angleList = input.angles
    .map((a) => `- id: ${a.id} — "${a.text}" (used ${a.usageCount} times)`)
    .join("\n")

  return `You are an SEO content strategist picking an angle for a new blog post.

Primary keyword: "${input.primaryKeyword}"
Site niche: ${input.siteNiche}

Recent posts on this site in the same cluster (for context — avoid duplicating these angles):
${recentList}

Available angles (with usage counts):
${angleList}

Pick EXACTLY ONE angle. Rules:
- Strongly prefer angles with LOW usage counts
- Break ties by thematic fit with the site niche and a sensible contrast against the recent posts above
- A high-count angle is acceptable ONLY if every low-count angle is a genuinely poor fit for this site right now
- Explain your choice briefly in the reasoning field

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "angleId": "the id from the list above",
  "reasoning": "one sentence"
}`
}
