export interface KeywordForBlog {
  id: string
  keyword: string
  searchVolume: number | null
  intent: string | null
  cluster: string | null
}

export interface InternalLinkCandidate {
  title: string
  url: string
  excerpt: string | null
  category: string | null
  tags: string | null
}

export interface BlogGenerationInput {
  siteNiche: string
  siteAudience: string
  siteTone: string
  siteTopics: string[]
  primaryKeyword: KeywordForBlog
  secondaryKeywords: KeywordForBlog[]
  existingPosts: InternalLinkCandidate[]
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

  const existingPostsJson = JSON.stringify(
    input.existingPosts.map((p) => ({
      title: p.title,
      url: p.url,
      excerpt: p.excerpt ?? "",
      category: p.category ?? "",
      tags: p.tags ?? "",
    })),
    null,
    2
  )

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

## CRITICAL RULE — keyword casing

Keywords are provided above in **lowercase** for matching purposes. DO NOT preserve that lowercase when you use them.

- **title**: Title Case every word of the keyword. "best unicorn party ideas" → "Best Unicorn Party Ideas". NEVER lowercase. This is the #1 rule — breaking it means the post is broken.
- **metaTitle**: Title Case every word of the keyword. Same as title.
- **H1, H2, H3 headings**: Title Case every word of the keyword.
- **Body copy**: sentence casing — keywords lowercase unless they start a sentence or are proper nouns.
- **URL slug**: lowercase (this is the ONLY field where the keyword stays lowercase).

Example — primary keyword "go to market strategy":
- ✅ title: "Your First Go to Market Strategy: A Founder's Playbook"
- ❌ title: "Your First go to market Strategy: A Founder's Playbook"
- ✅ slug: "your-first-go-to-market-strategy-founders-playbook"

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

## Internal links

You will be given a list of articles already published on this site (EXISTING_POSTS).
Your job: weave 2-4 contextual internal links into your blog body.

Rules:
- Find a natural phrase ALREADY in your draft body that semantically matches a target post.
  Wrap that phrase as a Markdown link: [phrase](url).
- DO NOT use the target post's exact title as the anchor unless it naturally fits the sentence.
- DO NOT add new sentences just to host a link. The link must fit existing flow.
- Spread links across the body — at most one in the intro, the rest distributed across H2 sections.
- Aim for 2-4 links. If only 1 fits naturally, use 1. If 0 fit, use 0.
- Never link to the post you're currently writing.
- If EXISTING_POSTS is empty, skip internal linking entirely.

EXISTING_POSTS:
${existingPostsJson}

## Blog structure

1. Direct answer first. The opening paragraph (right after the H1, BEFORE any H2)
   directly answers the search question implied by the keyword in 2-3 sentences.
   No "in this article we'll cover..." filler.

2. Sections via H2s. Each main idea = one H2. Use H3s only to subdivide an H2 when needed.
   Never use H4 or deeper.

3. Final section: Key takeaways. The last section is an H2 titled exactly
   "Key takeaways" followed by 4-7 bullet points summarizing the post.
   This is non-negotiable — every post ends this way.

4. One H1 only (the post title — already handled by your title field).

Respond with ONLY valid JSON matching this exact structure (no markdown wrapping, no explanation):
{
  "title": "Engaging blog post title — primary keyword in TITLE CASE (never lowercase, never sentence case)",
  "slug": "url-friendly-slug-derived-from-title (lowercase only)",
  "metaTitle": "SEO meta title, 50-60 characters — primary keyword in TITLE CASE",
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
