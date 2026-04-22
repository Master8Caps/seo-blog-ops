import { prisma } from "@/lib/db/prisma"
import { createMessage } from "@/lib/usage/anthropic"
import {
  buildAngleGenerationPrompt,
  type AngleGenerationResult,
} from "@/lib/ai/prompts/angle-generation"
import { parseAIJson } from "@/lib/ai/parse-json"

export interface GenerateAnglesInput {
  keywordId: string
  keyword: string
  siteId: string
  siteNiche: string
  siteAudience: string
  cluster: string | null
  replace?: boolean
}

export interface GenerateAnglesResult {
  success: boolean
  count: number
  error?: string
}

export async function generateAnglesForKeyword(
  input: GenerateAnglesInput
): Promise<GenerateAnglesResult> {
  const prompt = buildAngleGenerationPrompt({
    keyword: input.keyword,
    siteNiche: input.siteNiche,
    siteAudience: input.siteAudience,
    cluster: input.cluster,
  })

  let message
  try {
    message = await createMessage({
      params: {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      },
      operation: "generate-angles",
      attribution: { siteId: input.siteId },
    })
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "AI call failed",
    }
  }

  const textBlock = message.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    return { success: false, count: 0, error: "No text block in response" }
  }

  let parsed: AngleGenerationResult
  try {
    parsed = parseAIJson<AngleGenerationResult>(textBlock.text) as AngleGenerationResult
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "JSON parse failed",
    }
  }

  if (!Array.isArray(parsed.angles) || parsed.angles.length === 0) {
    return { success: false, count: 0, error: "No angles in response" }
  }

  // Sanitise: trim, dedupe case-insensitively, drop empties
  const seen = new Set<string>()
  const angles: string[] = []
  for (const raw of parsed.angles) {
    const text = typeof raw === "string" ? raw.trim() : ""
    const key = text.toLowerCase()
    if (text.length === 0 || seen.has(key)) continue
    seen.add(key)
    angles.push(text)
  }

  if (angles.length === 0) {
    return { success: false, count: 0, error: "All angles were empty after sanitisation" }
  }

  if (input.replace) {
    await prisma.keywordAngle.deleteMany({
      where: { keywordId: input.keywordId },
    })
  }

  const result = await prisma.keywordAngle.createMany({
    data: angles.map((text) => ({ keywordId: input.keywordId, text })),
  })

  return { success: true, count: result.count }
}
