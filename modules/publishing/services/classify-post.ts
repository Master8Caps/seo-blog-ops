// modules/publishing/services/classify-post.ts
"use server"

import { anthropic } from "@/lib/ai/client"
import { parseAIJson } from "@/lib/ai/parse-json"

interface TaxonomyOption {
  slug: string
  name: string
}

interface ClassificationResult {
  category: string
  tags: string[]
}

export async function classifyPost(
  postTitle: string,
  postContent: string,
  categories: TaxonomyOption[],
  tags: TaxonomyOption[],
  siteContext?: string
): Promise<ClassificationResult> {
  const prompt = `You are classifying a blog post into a site's taxonomy.

POST TITLE: ${postTitle}

POST CONTENT (first 2000 chars):
${postContent.slice(0, 2000)}

AVAILABLE CATEGORIES:
${categories.map((c) => `- ${c.slug}: ${c.name}`).join("\n")}

AVAILABLE TAGS:
${tags.map((t) => (typeof t === "string" ? `- ${t}` : `- ${t.slug}: ${t.name}`)).join("\n")}
${siteContext ? `\nSITE CONTEXT:\n${siteContext}` : ""}

Pick the SINGLE best matching category slug and 2-4 most relevant tag slugs from the lists above.
Only use slugs that exist in the lists. Do not suggest new categories or tags.

Respond in JSON:
{
  "category": "<category-slug>",
  "tags": ["<tag-slug>", ...]
}`

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  })

  const textBlock = message.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI classification returned no text")
  }

  const result = parseAIJson<ClassificationResult>(textBlock.text) as ClassificationResult

  // Validate returned slugs exist in the provided lists
  const validCatSlugs = new Set(categories.map((c) => c.slug))
  const validTagSlugs = new Set(
    tags.map((t) => (typeof t === "string" ? t : t.slug))
  )

  if (!validCatSlugs.has(result.category)) {
    result.category = categories[0]?.slug ?? ""
  }

  result.tags = result.tags.filter((slug) => validTagSlugs.has(slug))

  return result
}
