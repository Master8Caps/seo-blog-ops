import { prisma } from "@/lib/db/prisma"
import { generatePost } from "../actions/generate-post"
import { publishPost } from "@/modules/publishing/actions/publish-post"
import { reapStaleJobs } from "./queue-recovery"

export interface ProcessResult {
  processed: boolean
  jobId?: string
  status?: "completed" | "failed"
  reaped: number
  remaining: number
}

/**
 * Picks the next pending job off the queue and runs it to completion.
 *
 * Safe to call from anywhere server-side — no HTTP, no middleware,
 * no auth. Handles stale-job recovery at the top and self-chains to
 * the next pending job via Next.js after() so multi-job queues drain
 * without blocking the caller.
 */
export async function processNextJob(): Promise<ProcessResult> {
  const reaped = await reapStaleJobs()

  const job = await prisma.jobQueue.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  })

  if (!job) {
    return { processed: false, reaped, remaining: 0 }
  }

  await prisma.jobQueue.update({
    where: { id: job.id },
    data: { status: "processing" },
  })

  let finalStatus: "completed" | "failed" = "failed"

  try {
    if (job.type === "generate") {
      const result = await generatePost(job.siteId, job.id)
      if (!result.success) throw new Error(result.error ?? "Generation failed")

      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "completed",
          payload: { postId: result.postId },
        },
      })
      finalStatus = "completed"
    } else if (job.type === "publish") {
      const payload = job.payload as { postId?: string } | null
      if (!payload?.postId) throw new Error("Publish job missing postId")

      const result = await publishPost(payload.postId, job.id)
      if (!result.success) throw new Error(result.error ?? "Publishing failed")

      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "completed",
          payload: {
            postId: payload.postId,
            publishedUrl: result.publishedUrl,
          },
        },
      })
      finalStatus = "completed"
    }
  } catch (error) {
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: {
        status: "failed",
        payload: {
          ...((job.payload as object) ?? {}),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    })
  }

  const remaining = await prisma.jobQueue.count({
    where: { status: "pending" },
  })

  return {
    processed: true,
    jobId: job.id,
    status: finalStatus,
    reaped,
    remaining,
  }
}
