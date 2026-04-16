import { prisma } from "@/lib/db/prisma"

// Vercel function cap is 300s; anything stuck >10 min is definitely dead
// (processor was never reached, or the runtime died mid-flight).
const STALE_THRESHOLD_MS = 10 * 60 * 1000

/**
 * Marks jobs that have been pending or processing longer than STALE_THRESHOLD_MS
 * as failed, with a reason in the payload. Returns the number of jobs reaped.
 *
 * Idempotent — safe to call on every queue tick and every enqueue.
 */
export async function reapStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS)

  const stale = await prisma.jobQueue.findMany({
    where: {
      status: { in: ["pending", "processing"] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, payload: true },
  })

  if (stale.length === 0) return 0

  await Promise.all(
    stale.map((job) =>
      prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "failed",
          payload: {
            ...((job.payload as object) ?? {}),
            error: "Job timed out — queue processor never completed.",
          },
        },
      })
    )
  )

  return stale.length
}
