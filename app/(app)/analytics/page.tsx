import {
  getGlobalAnalytics,
} from "@/modules/integrations/services/get-global-analytics"
import type { AnalyticsWindow } from "@/modules/integrations/services/get-site-analytics"
import { ClicksOverTimeChart } from "@/modules/integrations/components/ClicksOverTimeChart"

export const dynamic = "force-dynamic"

export default async function GlobalAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window: windowParam } = await searchParams
  const window: AnalyticsWindow = windowParam === "7d" || windowParam === "90d" ? windowParam : "28d"
  const data = await getGlobalAnalytics(window)

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics — All sites</h1>
        <div className="flex rounded border overflow-hidden text-xs">
          {(["7d", "28d", "90d"] as const).map((w) => (
            <a
              key={w}
              href={`/analytics?window=${w}`}
              className={`px-3 py-1 ${w === window ? "bg-blue-600 text-white" : "hover:bg-muted"}`}
            >
              {w}
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Clicks" value={data.totals.clicks.toLocaleString()} />
        <Stat label="Impressions" value={data.totals.impressions.toLocaleString()} />
        <Stat label="CTR" value={`${(data.totals.ctr * 100).toFixed(2)}%`} />
        <Stat label="Avg position" value={data.totals.avgPosition === 0 ? "—" : data.totals.avgPosition.toFixed(1)} />
      </div>

      <ClicksOverTimeChart data={data.trend} />

      <div className="rounded border p-4">
        <h3 className="text-sm font-medium mb-3">Site leaderboard</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground text-xs">
            <tr>
              <th className="py-2">Site</th>
              <th className="py-2 text-right">Clicks</th>
              <th className="py-2 text-right">Impressions</th>
              <th className="py-2 text-right">CTR</th>
              <th className="py-2 text-right">Avg position</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((row) => (
              <tr key={row.siteId} className="border-t">
                <td className="py-2">
                  <a className="font-medium hover:underline" href={`/sites/${row.slug}/analytics`}>
                    {row.name}
                  </a>
                </td>
                <td className="py-2 text-right">{row.clicks.toLocaleString()}</td>
                <td className="py-2 text-right">{row.impressions.toLocaleString()}</td>
                <td className="py-2 text-right">{(row.ctr * 100).toFixed(2)}%</td>
                <td className="py-2 text-right">{row.avgPosition === 0 ? "—" : row.avgPosition.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}
