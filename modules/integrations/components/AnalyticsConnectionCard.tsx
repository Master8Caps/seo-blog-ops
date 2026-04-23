import { prisma } from "@/lib/db/prisma"

export async function AnalyticsConnectionCard({ siteId }: { siteId: string }) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { gscProperty: true, indexNowVerified: true, slug: true },
  })
  if (!site) return null

  return (
    <div className="rounded border p-4 text-sm space-y-2">
      <h3 className="font-medium">Analytics</h3>
      {site.gscProperty ? (
        <p className="text-xs text-muted-foreground">
          ✓ Auto-linked to <code>{site.gscProperty}</code>
        </p>
      ) : (
        <p className="text-xs text-amber-700">
          ⚠ No GSC property linked.{" "}
          <a className="underline" href="/settings/integrations/google">Resolve</a>
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        IndexNow: {site.indexNowVerified ? "✓ verified" : "⚠ not verified"}
      </p>
      <a className="text-xs underline" href={`/sites/${site.slug}/analytics`}>
        View analytics →
      </a>
    </div>
  )
}
