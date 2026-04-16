import { notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"
import { LinkButton } from "@/components/shared/link-button"
import { SiteFavicon } from "@/components/shared/site-favicon"
import { SiteTabs } from "@/components/shared/site-tabs"

// Covers server actions invoked from content/research children (generation, publishing)
export const maxDuration = 300

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ siteSlug: string }>
}) {
  const { siteSlug } = await params
  const site = await getSiteBySlug(siteSlug)

  if (!site) notFound()

  return (
    <div className="space-y-6">
      {/* Site Header */}
      <div className="flex items-center gap-4">
        <LinkButton href="/sites" variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <SiteFavicon url={site.url} logoUrl={site.logoUrl} size={40} className="shrink-0 rounded-md" />
            <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
            {site.autopilot && (
              <Badge variant="outline">Autopilot</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{site.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href={`/sites/${siteSlug}/edit`} variant="outline" size="sm">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </LinkButton>
        </div>
      </div>

      {/* Tabs */}
      <SiteTabs siteSlug={siteSlug} />

      {/* Page Content */}
      {children}
    </div>
  )
}
