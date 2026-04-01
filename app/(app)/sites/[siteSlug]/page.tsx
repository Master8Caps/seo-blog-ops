import {
  Globe,
  Users,
  MessageSquare,
  Tag,
  FileText,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"
import { notFound } from "next/navigation"
import type { SiteProfile } from "@/modules/sites/types"

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>
}) {
  const { siteSlug } = await params
  const site = await getSiteBySlug(siteSlug)

  if (!site) notFound()

  const profile = site.seoProfile as SiteProfile | null
  const topics = (site.topics as string[]) ?? []

  return (
    <div className="space-y-6">
      {site.description && (
        <p className="text-muted-foreground">{site.description}</p>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Keywords
          </div>
          <p className="mt-1 text-2xl font-bold">{site._count.keywords}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Posts
          </div>
          <p className="mt-1 text-2xl font-bold">{site._count.posts}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Status
          </div>
          <p className="mt-1 text-lg font-semibold capitalize">
            {site.onboardingStatus}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="h-4 w-4" />
            Last Crawled
          </div>
          <p className="mt-1 text-sm font-medium">
            {site.lastCrawledAt
              ? new Date(site.lastCrawledAt).toLocaleDateString()
              : "Never"}
          </p>
        </div>
      </div>

      {/* SEO Profile */}
      {profile && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">SEO Profile</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                Niche
              </div>
              <p className="mt-2">{site.niche}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Target Audience
              </div>
              <p className="mt-2">{site.audience}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Tone
              </div>
              <p className="mt-2">{site.tone}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Topics
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {profile.summary && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm font-medium text-muted-foreground">
                Summary
              </p>
              <p className="mt-2">{profile.summary}</p>
            </div>
          )}

          {profile.keywords && profile.keywords.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm font-medium text-muted-foreground">
                Seed Keywords
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.keywords.map((kw) => (
                  <Badge key={kw} variant="outline">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
