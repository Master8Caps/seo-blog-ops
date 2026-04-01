import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all autopilot sites
  const autopilotSites = await prisma.site.findMany({
    where: { autopilot: true },
    select: { id: true, slug: true },
  })

  if (autopilotSites.length === 0) {
    return NextResponse.json({ message: "No autopilot sites", queued: 0 })
  }

  let queued = 0

  for (const site of autopilotSites) {
    // Find the next unused approved keyword (oldest first)
    const nextKeyword = await prisma.keyword.findFirst({
      where: {
        siteId: site.id,
        status: "approved",
      },
      orderBy: { createdAt: "asc" },
    })

    if (!nextKeyword) continue

    // Check if there's already a pending/processing job for this site
    const existingJob = await prisma.jobQueue.findFirst({
      where: {
        siteId: site.id,
        status: { in: ["pending", "processing"] },
      },
    })

    if (existingJob) continue

    // Queue a generate job
    await prisma.jobQueue.create({
      data: {
        siteId: site.id,
        type: "generate",
        status: "pending",
        payload: { keywordId: nextKeyword.id },
      },
    })
    queued++
  }

  // Kick off the queue processor
  if (queued > 0) {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    fetch(`${baseUrl}/api/queue/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    }).catch(() => {
      // Fire and forget — processor will handle itself
    })
  }

  return NextResponse.json({
    message: `Queued ${queued} jobs for ${autopilotSites.length} autopilot sites`,
    queued,
  })
}
