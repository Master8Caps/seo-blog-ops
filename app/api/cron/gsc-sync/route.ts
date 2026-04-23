import { NextRequest, NextResponse } from "next/server"
import { syncAllSites } from "@/modules/integrations/services/gsc-sync"

export const maxDuration = 300

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const start = Date.now()
  try {
    const result = await syncAllSites()
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - start,
      ...result,
    })
  } catch (err) {
    console.error("[cron/gsc-sync] failed:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
