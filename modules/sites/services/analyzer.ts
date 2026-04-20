import { createMessage } from "@/lib/usage/anthropic"
import { parseAIJson } from "@/lib/ai/parse-json"
import {
  buildSiteAnalysisPrompt,
  type SiteAnalysisInput,
  type SiteAnalysisResult,
} from "@/lib/ai/prompts/site-analysis"

export async function analyzeSite(
  input: SiteAnalysisInput,
  siteId?: string
): Promise<SiteAnalysisResult> {
  const prompt = buildSiteAnalysisPrompt(input)

  const message = await createMessage({
    params: {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    },
    operation: "site-analysis",
    attribution: { siteId },
  })

  const textBlock = message.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI analysis")
  }

  try {
    const result = parseAIJson<SiteAnalysisResult>(textBlock.text)
    if (!result.niche || !result.audience || !result.topics) {
      throw new Error("Incomplete analysis result")
    }
    return result
  } catch (error) {
    throw new Error(
      `Failed to parse AI analysis response: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
