import Link from "next/link"
import {
  Globe,
  FileText,
  Search,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  PenLine,
  Eye,
} from "lucide-react"
import { getDashboardStats } from "@/modules/dashboard/actions/get-dashboard-stats"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SiteFavicon } from "@/components/shared/site-favicon"

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  crawling: { label: "Crawling", variant: "outline" },
  analyzed: { label: "Analyzed", variant: "default" },
  ready: { label: "Ready", variant: "default" },
}

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>
  try {
    stats = await getDashboardStats()
  } catch (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your content operations.
          </p>
        </div>
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          Failed to load dashboard data. Please try refreshing.
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-2 text-xs">{String(error)}</pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your content operations.
        </p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Sites"
          value={stats.totalSites}
          icon={Globe}
          description={`${stats.sitesByStatus.ready} ready, ${stats.sitesByStatus.analyzed} analyzed`}
        />
        <KpiCard
          title="Total Keywords"
          value={stats.totalKeywords}
          icon={Search}
          description={`${stats.approvedKeywords} approved`}
        />
        <KpiCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          description={`${stats.postsByStatus.published} published`}
        />
        <KpiCard
          title="Autopilot Active"
          value={stats.autopilotActive}
          icon={Zap}
          description={`of ${stats.totalSites} sites`}
        />
      </div>

      {/* Content Pipeline + Recent Sites */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Content Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Content Pipeline</CardTitle>
            <CardDescription>Posts by workflow stage</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalPosts === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                <PipelineRow
                  icon={PenLine}
                  label="Draft"
                  count={stats.postsByStatus.draft}
                  total={stats.totalPosts}
                />
                <PipelineRow
                  icon={Eye}
                  label="In Review"
                  count={stats.postsByStatus.review}
                  total={stats.totalPosts}
                />
                <PipelineRow
                  icon={CheckCircle2}
                  label="Approved"
                  count={stats.postsByStatus.approved}
                  total={stats.totalPosts}
                />
                <PipelineRow
                  icon={Globe}
                  label="Published"
                  count={stats.postsByStatus.published}
                  total={stats.totalPosts}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sites */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Sites</CardTitle>
                <CardDescription>Latest additions</CardDescription>
              </div>
              <Link
                href="/sites"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentSites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Globe className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No sites yet</p>
                <Link
                  href="/sites"
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Add your first site
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentSites.map((site) => {
                  const status =
                    statusConfig[site.onboardingStatus] ?? statusConfig.pending
                  return (
                    <Link
                      key={site.id}
                      href={`/sites/${site.slug}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 -mx-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SiteFavicon url={site.url} size={32} className="shrink-0 rounded-md" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {site.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(site.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={status.variant} className="text-xs shrink-0">
                        {status.label}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Site Onboarding Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Site Onboarding</CardTitle>
          <CardDescription>
            Sites progressing through setup stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StageCard
              label="Pending"
              count={stats.sitesByStatus.pending}
              color="bg-muted-foreground/40"
            />
            <StageCard
              label="Crawling"
              count={stats.sitesByStatus.crawling}
              color="bg-yellow-500/60"
            />
            <StageCard
              label="Analyzed"
              count={stats.sitesByStatus.analyzed}
              color="bg-blue-500/60"
            />
            <StageCard
              label="Ready"
              count={stats.sitesByStatus.ready}
              color="bg-green-500/60"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  description: string
}) {
  return (
    <Card>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function PipelineRow({
  icon: Icon,
  label,
  count,
  total,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  total: number
}) {
  const pct = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">{label}</span>
          <span className="text-sm font-medium">{count}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function StageCard({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border p-4">
      <div className={`mb-2 h-3 w-3 rounded-full ${color}`} />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
