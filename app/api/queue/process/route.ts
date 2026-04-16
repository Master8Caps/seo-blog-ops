import { NextRequest, NextResponse } from "next/server"
import { processNextJob } from "@/modules/content/services/process-queue"

export const maxDuration = 300

/**
 * HTTP entry point for the queue processor — used by cron jobs or manual
 * triggers. App code itself uses the Next.js after() path in
 * queue-generation.ts, which skips HTTP and middleware entirely.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await processNextJob()
  return NextResponse.json(result)
}
