export interface KeywordForBlog {
  id: string
  keyword: string
  searchVolume: number | null
  intent: string | null
  cluster: string | null
}

export interface BlogGenerationInput {
  siteNiche: string
  siteAudience: string
  siteTone: string
  siteTopics: string[]
  primaryKeyword: KeywordForBlog
  secondaryKeywords: KeywordForBlog[]
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

export interface KeywordGroupSelectionInput {
  siteNiche: string
  siteAudience: string
  keywords: Array<{
    keyword: string
    searchVolume: number | null
    intent: string | null
    cluster: string | null
  }>
}

export interface KeywordGroupSelectionResult {
  primary: string
  secondary: string[]
}

export function buildKeywordGroupSelectionPrompt(input: KeywordGroupSelectionInput): string {
  const keywordList = input.keywords
    .map(
      (k, i) =>
        `${i + 1}. "${k.keyword}" | volume: ${k.searchVolume ?? "?"} | intent: ${k.intent ?? "?"} | cluster: ${k.cluster ?? "?"}`
    )
    .join("\n")

  return `You are an SEO strategist selecting keywords for a single blog post.

Site niche: ${input.siteNiche}
Target audience: ${input.siteAudience}

From the approved keywords below, select 1 primary keyword and 1-2 secondary keywords that work well together for a single blog post. The keywords should be thematically related so they can be naturally incorporated into one article.

Selection criteria:
1. Pick a primary keyword with good search volume that will be the main focus
2. Pick 1-2 secondary keywords that complement the primary — related topics, long-tail variations, or supporting concepts
3. Avoid picking keywords that are too different to fit naturally in one post
4. Prefer keywords from the same or adjacent clusters

Available keywords:
${keywordList}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "primary": "the primary keyword text",
  "secondary": ["secondary keyword 1", "secondary keyword 2"]
}`
}

export function buildBlogGenerationPrompt(input: BlogGenerationInput): string {
  const secondaryList = input.secondaryKeywords.map((k) => k.keyword)

  return `You are an expert SEO blog writer. Write a comprehensive blog post optimized for multiple target keywords.

Site niche: ${input.siteNiche}
Target audience: ${input.siteAudience}
Writing tone: ${input.siteTone}
Core topics: ${input.siteTopics.join(", ")}

Primary keyword: "${input.primaryKeyword.keyword}"
Search intent: ${input.primaryKeyword.intent ?? "informational"}
Topic cluster: ${input.primaryKeyword.cluster ?? "general"}
Monthly search volume: ${input.primaryKeyword.searchVolume ?? "unknown"}

Secondary keywords to incorporate: ${secondaryList.length > 0 ? secondaryList.map((k) => `"${k}"`).join(", ") : "none"}

Requirements:
- Write 1000-1500 words of high-quality, original content
- Naturally incorporate the primary keyword "${input.primaryKeyword.keyword}" 3-5 times throughout the post
- Use the primary keyword in the first paragraph, at least one H2, and the conclusion
${secondaryList.length > 0 ? `- Naturally weave in each secondary keyword 1-2 times where it fits organically\n` : ""}- Structure with clear H2 and H3 headings, short paragraphs (2-3 sentences max)
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
  "title": "Engaging blog post title that includes the primary keyword naturally",
  "slug": "url-friendly-slug-derived-from-title",
  "metaTitle": "SEO meta title, 50-60 characters, includes primary keyword",
  "metaDesc": "SEO meta description, 150-160 characters, compelling with primary keyword",
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
