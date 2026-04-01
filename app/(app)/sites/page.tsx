import { Globe, Plus } from "lucide-react"
import { getSites } from "@/modules/sites/actions/get-sites"
import { SiteCard } from "@/components/shared/site-card"
import { LinkButton } from "@/components/shared/link-button"

export default async function SitesPage() {
  const sites = await getSites()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
          <p className="text-muted-foreground">
            Manage your websites and SEO profiles.
          </p>
        </div>
        <LinkButton href="/sites/new">
          <Plus className="mr-2 h-4 w-4" />
          Add Site
        </LinkButton>
      </div>

      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Globe className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No sites yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first website to get started.
          </p>
          <LinkButton href="/sites/new" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Site
          </LinkButton>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              slug={site.slug}
              name={site.name}
              url={site.url}
              niche={site.niche}
              onboardingStatus={site.onboardingStatus}
              autopilot={site.autopilot}
              postCount={site._count.posts}
              keywordCount={site._count.keywords}
            />
          ))}
        </div>
      )}
    </div>
  )
}
