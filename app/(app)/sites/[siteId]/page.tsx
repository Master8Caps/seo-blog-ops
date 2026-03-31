import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Globe,
  Users,
  MessageSquare,
  Tag,
  FileText,
  Search,
  ArrowLeft,
  Pencil,
} from "lucide-react"
import { getSiteById } from "@/modules/sites/actions/get-sites"
import type { SiteProfile } from "@/modules/sites/types"

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const site = await getSiteById(siteId)

  if (!site) notFound()

  const profile = site.seoProfile as SiteProfile | null
  const topics = (site.topics as string[]) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/sites"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
            {site.autopilot && (
              <Badge variant="outline">Autopilot</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{site.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sites/${siteId}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </Link>
        </div>
      </div>

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

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link
          href={`/sites/${siteId}/research`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Search className="mr-2 h-4 w-4" />
          Keyword Research
        </Link>
        <Link
          href={`/sites/${siteId}/content`}
          className={buttonVariants({ variant: "outline" })}
        >
          <FileText className="mr-2 h-4 w-4" />
          Content
        </Link>
      </div>
    </div>
  )
}
