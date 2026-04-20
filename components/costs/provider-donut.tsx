import { Card } from "@/components/ui/card"

interface ProviderShare {
  provider: string
  costGbp: number
  pct: number
}

interface ProviderDonutProps {
  providers: ProviderShare[]
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"]

export function ProviderDonut({ providers }: ProviderDonutProps) {
  const radius = 50
  const stroke = 14
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3">Spend by provider</h3>
      {providers.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No data yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {providers.map((p, i) => {
              const dash = (p.pct / 100) * circumference
              const offset = -((cumulative / 100) * circumference)
              cumulative += p.pct
              return (
                <circle
                  key={p.provider}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                />
              )
            })}
          </svg>
          <ul className="flex-1 text-xs">
            {providers.map((p, i) => (
              <li key={p.provider} className="flex justify-between py-1">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {p.provider}
                </span>
                <span>£{p.costGbp.toFixed(2)} ({p.pct.toFixed(0)}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
