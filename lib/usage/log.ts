import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { computeCostUsd } from "./pricing"
import { fetchUsdGbpRate } from "./exchange-rate"
import type { Attribution, Operation, Provider, UsageUnits } from "./types"

export interface LogUsageInput {
  provider: Provider
  model: string | null
  operation: Operation
  units: UsageUnits
  attribution: Attribution
  /** Used by DataForSEO which returns cost directly. Overrides computeCostUsd(). */
  costUsdOverride?: number
  durationMs?: number
  errorMessage?: string
  metadata?: Record<string, unknown>
}

/**
 * Single write path for usage events. All wrappers in lib/usage/ call this after each provider call.
 * Failures here log to console but never throw — instrumentation must not break the user-facing call.
 */
export async function logUsageEvent(input: LogUsageInput): Promise<void> {
  try {
    const exchangeRate = await fetchUsdGbpRate()
    const costUsd =
      input.costUsdOverride !== undefined
        ? input.costUsdOverride
        : computeCostUsd({
            provider: input.provider,
            model: input.model,
            units: input.units,
          })
    const costGbp = costUsd * exchangeRate

    await prisma.usageEvent.create({
      data: {
        provider: input.provider,
        model: input.model,
        operation: input.operation,
        inputTokens: input.units.inputTokens ?? null,
        outputTokens: input.units.outputTokens ?? null,
        wordCount: input.units.wordCount ?? null,
        imageCount: input.units.imageCount ?? null,
        apiCallCount: input.units.apiCallCount ?? null,
        costUsd,
        costGbp,
        exchangeRate,
        siteId: input.attribution.siteId ?? null,
        postId: input.attribution.postId ?? null,
        researchRunId: input.attribution.researchRunId ?? null,
        jobId: input.attribution.jobId ?? null,
        metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
        durationMs: input.durationMs ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    })
  } catch (err) {
    console.error("[usage/log] failed to write usage event:", err, input)
  }
}
