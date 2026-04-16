"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { reapStaleJobs } from "../services/queue-recovery"
import { processNextJob } from "../services/process-queue"

export interface ActivityJob {
  id: string
  type: string
  status: string
  siteId: string
  siteName: string
  siteSlug: string
  step: string | null
  error: string | null
  postId: string | null
  publishedUrl: string | null
  createdAt: Date
  updatedAt: Date
}

function mapJob(job: {
  id: string
  type: string
  status: string
  siteId: string
  site: { name: string; slug: string }
  payload: unknown
  createdAt: Date
  updatedAt: Date
}): ActivityJob {
  const payload = (job.payload ?? {}) as {
    step?: string
    error?: string
    postId?: string
    publishedUrl?: string
  }
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    siteId: job.siteId,
    siteName: job.site.name,
    siteSlug: job.site.slug,
    step: payload.step ?? null,
    error: payload.error ?? null,
    postId: payload.postId ?? null,
    publishedUrl: payload.publishedUrl ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

export async function getActiveJobCount(): Promise<number> {
  return prisma.jobQueue.count({
    where: { status: { in: ["pending", "processing"] } },
  })
}

export async function getJobActivity(): Promise<{
  inFlight: ActivityJob[]
  recent: ActivityJob[]
}> {
  const [inFlight, recent] = await Promise.all([
    prisma.jobQueue.findMany({
      where: { status: { in: ["pending", "processing"] } },
      orderBy: { createdAt: "desc" },
      include: { site: { select: { name: true, slug: true } } },
    }),
    prisma.jobQueue.findMany({
      where: { status: { in: ["completed", "failed"] } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { site: { select: { name: true, slug: true } } },
    }),
  ])

  return {
    inFlight: inFlight.map(mapJob),
    recent: recent.map(mapJob),
  }
}

export async function retryJob(jobId: string): Promise<{
  success: boolean
  error?: string
}> {
  const job = await prisma.jobQueue.findUnique({ where: { id: jobId } })
  if (!job) return { success: false, error: "Job not found" }
  if (job.status !== "failed") {
    return { success: false, error: "Only failed jobs can be retried" }
  }

  const payload = (job.payload ?? {}) as Record<string, unknown>
  delete payload.error
  delete payload.step

  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { status: "pending", payload: payload as never },
  })

  after(async () => {
    let remaining = 1
    while (remaining > 0) {
      const result = await processNextJob()
      if (!result.processed) break
      remaining = result.remaining
    }
  })

  revalidatePath("/activity")
  return { success: true }
}

/**
 * Manually trigger the processor. Drains any pending jobs in the background.
 * Useful if the queue gets stuck for some reason — click the button, done.
 */
export async function triggerProcessor(): Promise<{ processed: boolean }> {
  const result = await processNextJob()

  if (result.remaining > 0) {
    after(async () => {
      let remaining = result.remaining
      while (remaining > 0) {
        const next = await processNextJob()
        if (!next.processed) break
        remaining = next.remaining
      }
    })
  }

  revalidatePath("/activity")
  return { processed: result.processed }
}

export async function clearStaleJobs(): Promise<{ reaped: number }> {
  const reaped = await reapStaleJobs()
  revalidatePath("/activity")
  return { reaped }
}

/**
 * Force-fail a single in-flight job. Escape hatch for the rare case where
 * a job is stuck but hasn't hit the 10-minute stale threshold yet.
 */
export async function forceFailJob(jobId: string): Promise<{
  success: boolean
  error?: string
}> {
  const job = await prisma.jobQueue.findUnique({ where: { id: jobId } })
  if (!job) return { success: false, error: "Job not found" }
  if (!["pending", "processing"].includes(job.status)) {
    return { success: false, error: "Job is not in-flight" }
  }

  const payload = (job.payload ?? {}) as Record<string, unknown>
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: {
      status: "failed",
      payload: {
        ...payload,
        error: "Cancelled manually from activity page",
      } as never,
    },
  })

  revalidatePath("/activity")
  return { success: true }
}
