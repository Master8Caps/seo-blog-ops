import type { SiteAnalyticsSummary } from "@/modules/integrations/services/get-site-analytics"

function MetricsTable({
  title,
  rows,
  keyField,
}: {
  title: string
  rows: Array<{ clicks: number; impressions: number; ctr: number; position: number } & Record<string, unknown>>
  keyField: "page" | "query"
}) {
  return (
    <div className="rounded border p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground text-xs">
          <tr>
            <th className="py-2">{keyField === "page" ? "Page" : "Query"}</th>
            <th className="py-2 text-right">Clicks</th>
            <th className="py-2 text-right">Impressions</th>
            <th className="py-2 text-right">CTR</th>
            <th className="py-2 text-right">Position</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No data</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 truncate max-w-md">{String(r[keyField])}</td>
              <td className="py-2 text-right">{r.clicks.toLocaleString()}</td>
              <td className="py-2 text-right">{r.impressions.toLocaleString()}</td>
              <td className="py-2 text-right">{(r.ctr * 100).toFixed(2)}%</td>
              <td className="py-2 text-right">{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AnalyticsTables({
  topPages,
  topQueries,
}: {
  topPages: SiteAnalyticsSummary["topPages"]
  topQueries: SiteAnalyticsSummary["topQueries"]
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <MetricsTable title="Top pages" rows={topPages} keyField="page" />
      <MetricsTable title="Top queries" rows={topQueries} keyField="query" />
    </div>
  )
}
