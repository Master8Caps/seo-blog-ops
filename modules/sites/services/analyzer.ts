import { anthropic } from "@/lib/ai/client"
import {
  buildSiteAnalysisPrompt,
  type SiteAnalysisInput,
  type SiteAnalysisResult,
} from "@/lib/ai/prompts/site-analysis"

export async function analyzeSite(
  input: SiteAnalysisInput
): Promise<SiteAnalysisResult> {
  const prompt = buildSiteAnalysisPrompt(input)

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  })

  const textBlock = message.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI analysis")
  }

  try {
    const result = JSON.parse(textBlock.text) as SiteAnalysisResult
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
