export interface BlogGenerationInput {
  siteNiche: string
  siteAudience: string
  siteTone: string
  siteTopics: string[]
  keyword: string
  keywordIntent: string | null
  keywordCluster: string | null
  searchVolume: number | null
}

export interface BlogGenerationResult {
  title: string
  slug: string
  metaTitle: string
  metaDesc: string
  excerpt: string
  content: string
  imagePrompts: Array<{
    section: string
    prompt: string
  }>
}

export function buildBlogGenerationPrompt(input: BlogGenerationInput): string {
  return `You are an expert SEO blog writer. Write a comprehensive blog post optimized for the target keyword.

Site niche: ${input.siteNiche}
Target audience: ${input.siteAudience}
Writing tone: ${input.siteTone}
Core topics: ${input.siteTopics.join(", ")}

Target keyword: "${input.keyword}"
Search intent: ${input.keywordIntent ?? "informational"}
Topic cluster: ${input.keywordCluster ?? "general"}
Monthly search volume: ${input.searchVolume ?? "unknown"}

Requirements:
- Write 1000-1500 words of high-quality, original content
- Naturally incorporate the target keyword "${input.keyword}" 3-5 times throughout the post
- Use the keyword in the first paragraph, at least one H2, and the conclusion
- Structure with clear H2 and H3 headings, short paragraphs (2-3 sentences max)
- Include practical advice, examples, or actionable tips
- Write in markdown format
- Include exactly 4 image placement markers in your content:
  - \`![featured](IMAGE_FEATURED)\` — at the very top, before any text
  - \`![section](IMAGE_1)\` — after the first major section
  - \`![section](IMAGE_2)\` — in the middle of the post
  - \`![section](IMAGE_3)\` — near the end, before the conclusion
- Generate a descriptive image prompt for each marker that matches the surrounding content

Respond with ONLY valid JSON matching this exact structure (no markdown wrapping, no explanation):
{
  "title": "Engaging blog post title that includes the keyword naturally",
  "slug": "url-friendly-slug-derived-from-title",
  "metaTitle": "SEO meta title, 50-60 characters, includes keyword",
  "metaDesc": "SEO meta description, 150-160 characters, compelling with keyword",
  "excerpt": "2-3 sentence summary of the post for previews",
  "content": "Full markdown content with image markers as specified above",
  "imagePrompts": [
    { "section": "featured", "prompt": "Detailed description of the featured image" },
    { "section": "section-1", "prompt": "Detailed description for first section image" },
    { "section": "section-2", "prompt": "Detailed description for second section image" },
    { "section": "section-3", "prompt": "Detailed description for third section image" }
  ]
}`
}
