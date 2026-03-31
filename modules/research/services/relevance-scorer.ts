import { anthropic } from "@/lib/ai/client"
import {
  buildRelevanceScoringPrompt,
  type RelevanceScoringInput,
  type RelevanceScoringResult,
} from "@/lib/ai/prompts/keyword-relevance"

export async function scoreKeywordRelevance(
  input: RelevanceScoringInput
): Promise<RelevanceScoringResult> {
  // Process in batches of 50 to stay within token limits
  const batchSize = 50
  const allScores: RelevanceScoringResult["scores"] = []

  for (let i = 0; i < input.keywords.length; i += batchSize) {
    const batch = input.keywords.slice(i, i + batchSize)
    const prompt = buildRelevanceScoringPrompt({
      ...input,
      keywords: batch,
    })

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const textBlock = message.content.find((block) => block.type === "text")
    if (!textBlock || textBlock.type !== "text") continue

    try {
      const result = JSON.parse(textBlock.text) as RelevanceScoringResult
      allScores.push(...result.scores)
    } catch {
      // If a batch fails to parse, assign default scores
      for (const kw of batch) {
        allScores.push({
          keyword: kw,
          relevance: 0.5,
          intent: "informational",
          cluster: "uncategorized",
        })
      }
    }
  }

  return { scores: allScores }
}
