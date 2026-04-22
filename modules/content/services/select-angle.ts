import { prisma } from "@/lib/db/prisma"
import { createMessage } from "@/lib/usage/anthropic"
import {
  buildAngleSelectionPrompt,
  type AngleSelectionResult,
  type AngleWithCount,
} from "@/lib/ai/prompts/angle-selection"
import { parseAIJson } from "@/lib/ai/parse-json"
import type { RecentClusterPost } from "./get-recent-cluster-posts"

export interface SelectAngleInput {
  keywordId: string
  primaryKeyword: string
  siteId: string
  siteNiche: string
  recentClusterPosts: RecentClusterPost[]
  jobId?: string
}

export interface SelectedAngle {
  id: string
  text: string
}

export async function selectAngleForKeyword(
  input: SelectAngleInput
): Promise<SelectedAngle | null> {
  const rows = await prisma.keywordAngle.findMany({
    where: { keywordId: input.keywordId },
    include: { _count: { select: { posts: true } } },
  })

  if (rows.length === 0) return null

  const angles: AngleWithCount[] = rows.map((r) => ({
    id: r.id,
    text: r.text,
    usageCount: r._count.posts,
  }))

  const prompt = buildAngleSelectionPrompt({
    primaryKeyword: input.primaryKeyword,
    siteNiche: input.siteNiche,
    recentClusterPosts: input.recentClusterPosts,
    angles,
  })

  let message
  try {
    message = await createMessage({
      params: {
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      },
      operation: "select-angle",
      attribution: { siteId: input.siteId, jobId: input.jobId },
    })
  } catch (err) {
    console.warn(
      `[select-angle] AI call failed, falling back to lowest-count: ${err instanceof Error ? err.message : err}`
    )
    return fallbackLowest(angles)
  }

  const textBlock = message.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    return fallbackLowest(angles)
  }

  let parsed: AngleSelectionResult
  try {
    parsed = parseAIJson<AngleSelectionResult>(textBlock.text) as AngleSelectionResult
  } catch {
    return fallbackLowest(angles)
  }

  const matched = rows.find((r) => r.id === parsed.angleId)
  if (!matched) return fallbackLowest(angles)

  return { id: matched.id, text: matched.text }
}

function fallbackLowest(angles: AngleWithCount[]): SelectedAngle | null {
  if (angles.length === 0) return null
  const sorted = [...angles].sort((a, b) => a.usageCount - b.usageCount)
  return { id: sorted[0].id, text: sorted[0].text }
}
