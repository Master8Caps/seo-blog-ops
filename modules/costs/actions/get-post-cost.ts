"use server"

import { prisma } from "@/lib/db/prisma"
import type { Operation } from "@/lib/usage/types"

export interface OperationGroup {
  operation: Operation | string
  label: string
  model: string | null
  costGbp: number
  inputTokens: number
  outputTokens: number
  imageCount: number
  wordCount: number
  callCount: number
}

export interface CallRow {
  id: string
  createdAt: Date
  provider: string
  model: string | null
  operation: string
  costGbp: number
  inputTokens: number | null
  outputTokens: number | null
  imageCount: number | null
  wordCount: number | null
  errorMessage: string | null
}

export interface PostCostSummary {
  totalGbp: number
  totalUsd: number
  callCount: number
  groups: OperationGroup[]
  calls: CallRow[]
  vsAvgPercent: number | null
}

const OPERATION_LABELS: Record<string, string> = {
  "generate-content": "Content generation",
  "humanize": "Humanization",
  "image-gen": "Image generation",
  "classify-taxonomy": "Taxonomy classification",
  "select-keywords": "Keyword selection",
}

export async function getPostCost(postId: string): Promise<PostCostSummary> {
  const events = await prisma.usageEvent.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  })

  const totalGbp = events.reduce((s, e) => s + Number(e.costGbp), 0)
  const totalUsd = events.reduce((s, e) => s + Number(e.costUsd), 0)

  const groupMap = new Map<string, OperationGroup>()
  for (const e of events) {
    const key = e.operation
    const existing = groupMap.get(key)
    if (existing) {
      existing.costGbp += Number(e.costGbp)
      existing.inputTokens += e.inputTokens ?? 0
      existing.outputTokens += e.outputTokens ?? 0
      existing.imageCount += e.imageCount ?? 0
      existing.wordCount += e.wordCount ?? 0
      existing.callCount += 1
    } else {
      groupMap.set(key, {
        operation: e.operation,
        label: OPERATION_LABELS[e.operation] ?? e.operation,
        model: e.model,
        costGbp: Number(e.costGbp),
        inputTokens: e.inputTokens ?? 0,
        outputTokens: e.outputTokens ?? 0,
        imageCount: e.imageCount ?? 0,
        wordCount: e.wordCount ?? 0,
        callCount: 1,
      })
    }
  }

  // Compute "vs site avg" — average cost across all OTHER posts on the same site
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { siteId: true },
  })

  let vsAvgPercent: number | null = null
  if (post?.siteId) {
    const siblings = await prisma.usageEvent.groupBy({
      by: ["postId"],
      where: { siteId: post.siteId, postId: { not: null } },
      _sum: { costGbp: true },
    })
    if (siblings.length > 1) {
      const totals = siblings.map((s) => Number(s._sum.costGbp ?? 0))
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length
      if (avg > 0) {
        vsAvgPercent = ((totalGbp - avg) / avg) * 100
      }
    }
  }

  return {
    totalGbp,
    totalUsd,
    callCount: events.length,
    groups: [...groupMap.values()].sort((a, b) => b.costGbp - a.costGbp),
    calls: events.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      provider: e.provider,
      model: e.model,
      operation: e.operation,
      costGbp: Number(e.costGbp),
      inputTokens: e.inputTokens,
      outputTokens: e.outputTokens,
      imageCount: e.imageCount,
      wordCount: e.wordCount,
      errorMessage: e.errorMessage,
    })),
    vsAvgPercent,
  }
}
