import { prisma } from "@/lib/db/prisma"
import { ReindexButton } from "./ReindexButton"

interface Props {
  postId: string
  publishedUrl: string | null
}

export async function PostPerformanceCard({ postId, publishedUrl }: Props) {
  if (!publishedUrl) return null

  const [pageMetrics, indexingLogs] = await Promise.all([
    prisma.gscMetricPage.findFirst({
      where: { window: "28d", page: publishedUrl },
      select: { clicks: true, impressions: true, ctr: true, position: true },
    }),
    prisma.indexingLog.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ])

  return (
    <section className="rounded border p-4 mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Performance (last 28 days)</h3>
        <ReindexButton postId={postId} />
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <Stat label="Clicks" value={(pageMetrics?.clicks ?? 0).toLocaleString()} />
        <Stat label="Impressions" value={(pageMetrics?.impressions ?? 0).toLocaleString()} />
        <Stat label="CTR" value={pageMetrics ? `${(pageMetrics.ctr * 100).toFixed(2)}%` : "—"} />
        <Stat label="Position" value={pageMetrics ? pageMetrics.position.toFixed(1) : "—"} />
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Last indexing attempts</h4>
        {indexingLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">None yet</p>
        ) : (
          <ul className="text-xs space-y-1">
            {indexingLogs.map((log) => (
              <li key={log.id} className="flex justify-between">
                <span>{log.target}</span>
                <span title={log.error ?? ""}>
                  {log.status === "ok" ? "✓" : log.status === "error" ? "✗" : "—"}{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}
