import { getPostCost } from "@/modules/costs/actions/get-post-cost"
import { Card } from "@/components/ui/card"
import { formatGbp, formatUsd } from "@/lib/format"

interface CostPanelProps {
  postId: string
}

export async function CostPanel({ postId }: CostPanelProps) {
  const summary = await getPostCost(postId)

  if (summary.callCount === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">No cost data yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between border-b border-border pb-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total cost</p>
          <p className="text-2xl font-semibold">{formatGbp(summary.totalGbp)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatUsd(summary.totalUsd)} USD · {summary.callCount} calls
          </p>
        </div>
        {summary.vsAvgPercent !== null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">vs site avg</p>
            <p
              className={`text-sm ${
                summary.vsAvgPercent < 0 ? "text-green-500" : "text-amber-500"
              }`}
            >
              {summary.vsAvgPercent > 0 ? "+" : ""}
              {summary.vsAvgPercent.toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {summary.groups.map((g) => (
          <li
            key={g.operation}
            className="flex justify-between items-center px-3 py-2 bg-muted/40 rounded-md"
          >
            <div>
              <p className="text-sm">{g.label}</p>
              <p className="text-xs text-muted-foreground">
                {g.model ? `${g.model} · ` : ""}
                {formatUnits(g)}
              </p>
            </div>
            <p className="text-sm">{formatGbp(g.costGbp)}</p>
          </li>
        ))}
      </ul>

      <details className="mt-3 pt-3 border-t border-border">
        <summary className="text-xs text-blue-400 cursor-pointer">
          Show {summary.calls.length} individual calls
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-xs">
          {summary.calls.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_auto] gap-2 px-2 py-1 bg-muted/30 rounded"
            >
              <span>
                <span className="text-muted-foreground">
                  {c.createdAt.toISOString().slice(11, 19)}
                </span>{" "}
                {c.operation} · {c.model ?? c.provider}
                {c.errorMessage && (
                  <span className="text-red-400 ml-2">· {c.errorMessage}</span>
                )}
              </span>
              <span className="text-right">{formatGbp(c.costGbp)}</span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  )
}

function formatUnits(g: {
  inputTokens: number
  outputTokens: number
  imageCount: number
  wordCount: number
}): string {
  const parts: string[] = []
  if (g.inputTokens > 0 || g.outputTokens > 0) {
    parts.push(`${formatK(g.inputTokens)} in / ${formatK(g.outputTokens)} out`)
  }
  if (g.imageCount > 0) parts.push(`${g.imageCount} image${g.imageCount === 1 ? "" : "s"}`)
  if (g.wordCount > 0) parts.push(`${g.wordCount} words`)
  return parts.join(" · ")
}

function formatK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
