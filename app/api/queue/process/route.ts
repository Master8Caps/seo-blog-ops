import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { generatePost } from "@/modules/content/actions/generate-post"
import { publishPost } from "@/modules/publishing/actions/publish-post"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  // Verify secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch next pending job
  const job = await prisma.jobQueue.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  })

  if (!job) {
    return NextResponse.json({ message: "No pending jobs" })
  }

  // Mark as processing
  await prisma.jobQueue.update({
    where: { id: job.id },
    data: { status: "processing" },
  })

  try {
    if (job.type === "generate") {
      // AI picks keywords automatically — just pass siteId
      const result = await generatePost(job.siteId, job.id)

      if (!result.success) {
        throw new Error(result.error ?? "Generation failed")
      }

      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "completed",
          payload: { postId: result.postId },
        },
      })
    } else if (job.type === "publish") {
      const payload = job.payload as { postId?: string } | null
      if (!payload?.postId) throw new Error("Publish job missing postId")

      const result = await publishPost(payload.postId, job.id)

      if (!result.success) {
        throw new Error(result.error ?? "Publishing failed")
      }

      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "completed",
          payload: { postId: payload.postId, publishedUrl: result.publishedUrl },
        },
      })
    }
  } catch (error) {
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: {
        status: "failed",
        payload: {
          ...(job.payload as object ?? {}),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    })
  }

  // Check if more jobs remain, chain to next
  const remaining = await prisma.jobQueue.count({
    where: { status: "pending" },
  })

  if (remaining > 0) {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    fetch(`${baseUrl}/api/queue/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    }).catch(() => {
      // Fire and forget
    })
  }

  return NextResponse.json({
    message: `Processed job ${job.id}`,
    remaining,
  })
}
