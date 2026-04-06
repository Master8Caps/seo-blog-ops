// modules/publishing/services/classify-post.ts
"use server"

import { anthropic } from "@/lib/ai/client"
import { parseAIJson } from "@/lib/ai/parse-json"

interface TaxonomyOption {
  id: number
  name: string
}

interface ClassificationResult {
  categoryId: number
  tagIds: number[]
}

export async function classifyPost(
  postTitle: string,
  postContent: string,
  categories: TaxonomyOption[],
  tags: TaxonomyOption[]
): Promise<ClassificationResult> {
  const prompt = `You are classifying a blog post into an existing WordPress taxonomy.

POST TITLE: ${postTitle}

POST CONTENT (first 2000 chars):
${postContent.slice(0, 2000)}

AVAILABLE CATEGORIES:
${categories.map((c) => `- ID ${c.id}: ${c.name}`).join("\n")}

AVAILABLE TAGS:
${tags.map((t) => `- ID ${t.id}: ${t.name}`).join("\n")}

Pick the SINGLE best matching category and 2-4 most relevant tags from the lists above.
Only use IDs that exist in the lists. Do not suggest new categories or tags.

Respond in JSON:
{
  "categoryId": <number>,
  "tagIds": [<number>, ...]}`

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

  // Validate returned IDs exist in the provided lists
  const validCatIds = new Set(categories.map((c) => c.id))
  const validTagIds = new Set(tags.map((t) => t.id))

  if (!validCatIds.has(result.categoryId)) {
    // Fallback to first category
    result.categoryId = categories[0]?.id ?? 1
  }

  result.tagIds = result.tagIds.filter((id) => validTagIds.has(id))

  return result
}
