"use server"

import { after } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { reapStaleJobs } from "../services/queue-recovery"
import { processNextJob } from "../services/process-queue"

interface QueueResult {
  success: boolean
  jobId?: string
  error?: string
}

/**
 * Scheduled via Next.js after() — runs post-response, drains the queue
 * one job at a time. No HTTP round-trip, no middleware, no CRON_SECRET.
 * Just a direct function call after the user's response returns.
 */
async function drainQueue(): Promise<void> {
  let remaining = 1
  while (remaining > 0) {
    const result = await processNextJob()
    if (!result.processed) break
    remaining = result.remaining
  }
}

/**
 * Queue a post generation job. Returns immediately; processing runs
 * in the same function invocation after the response is sent.
 */
export async function queuePostGeneration(siteId: string): Promise<QueueResult> {
  await reapStaleJobs()

  const keywordCount = await prisma.keyword.count({
    where: { siteId, status: "approved" },
  })

  if (keywordCount === 0) {
    return { success: false, error: "No approved keywords available. Run research first." }
  }

  const existingJob = await prisma.jobQueue.findFirst({
    where: {
      siteId,
      type: "generate",
      status: { in: ["pending", "processing"] },
    },
  })

  if (existingJob) {
    return { success: false, error: "A post is already being generated for this site." }
  }

  const job = await prisma.jobQueue.create({
    data: {
      siteId,
      type: "generate",
      status: "pending",
    },
  })

  // Runs after the response returns — extends the function to cover processing.
  after(drainQueue)

  return { success: true, jobId: job.id }
}

/**
 * Queue a post publish job. Same after() pattern as generation.
 */
export async function queuePostPublish(postId: string): Promise<QueueResult> {
  await reapStaleJobs()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { site: true },
  })

  if (!post) return { success: false, error: "Post not found" }
  if (post.status === "published") return { success: false, error: "Post is already published" }
  if (!post.site.publishType) {
    return { success: false, error: "Publishing not configured for this site" }
  }

  const existingJob = await prisma.jobQueue.findFirst({
    where: {
      siteId: post.siteId,
      type: "publish",
      status: { in: ["pending", "processing"] },
      payload: { path: ["postId"], equals: postId },
    },
  })

  if (existingJob) {
    return { success: false, error: "This post is already being published." }
  }

  const job = await prisma.jobQueue.create({
    data: {
      siteId: post.siteId,
      type: "publish",
      status: "pending",
      payload: { postId },
    },
  })

  after(drainQueue)

  return { success: true, jobId: job.id }
}

/**
 * Check the status of a generation job.
 */
export async function getJobStatus(jobId: string) {
  const job = await prisma.jobQueue.findUnique({
    where: { id: jobId },
    select: { status: true, payload: true },
  })
  if (!job) return null
  const payload = job.payload as { step?: string; error?: string; postId?: string } | null
  return {
    status: job.status,
    step: payload?.step ?? null,
    error: payload?.error ?? null,
    postId: payload?.postId ?? null,
  }
}
