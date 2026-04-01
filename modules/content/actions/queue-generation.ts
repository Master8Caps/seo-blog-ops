"use server"

import { prisma } from "@/lib/db/prisma"

interface QueueResult {
  success: boolean
  jobId?: string
  error?: string
}

/**
 * Queue a post generation job. Returns immediately — processing
 * happens in the background via /api/queue/process.
 */
export async function queuePostGeneration(siteId: string): Promise<QueueResult> {
  // Check site has approved keywords
  const keywordCount = await prisma.keyword.count({
    where: { siteId, status: "approved" },
  })

  if (keywordCount === 0) {
    return { success: false, error: "No approved keywords available. Run research first." }
  }

  // Check for existing pending/processing job
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

  // Create the job
  const job = await prisma.jobQueue.create({
    data: {
      siteId,
      type: "generate",
      status: "pending",
    },
  })

  // Kick off the queue processor
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"
  const cronSecret = process.env.CRON_SECRET

  fetch(`${baseUrl}/api/queue/process`, {
    method: "POST",
    headers: {
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
  }).catch(() => {
    // Fire and forget
  })

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
  return job
}
