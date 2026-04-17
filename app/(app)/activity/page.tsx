import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getJobActivity,
  type ActivityJob,
} from "@/modules/content/actions/get-activity"
import { ActivityAutoRefresh } from "./auto-refresh"
import {
  RetryButton,
  CancelButton,
  ClearStaleButton,
  RunProcessorButton,
} from "./job-actions"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const jobTypeLabel: Record<string, string> = {
  generate: "Content generation",
  publish: "Publishing",
}

function formatDuration(from: Date, to: Date = new Date()): string {
  const seconds = Math.floor((to.getTime() - from.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }
  > = {
    pending: { label: "Pending", variant: "secondary", icon: Clock },
    processing: { label: "Processing", variant: "default", icon: Loader2 },
    completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
    failed: { label: "Failed", variant: "destructive", icon: XCircle },
  }
  const c = config[status] ?? config.pending
  const Icon = c.icon
  return (
    <Badge variant={c.variant} className="gap-1">
      <Icon
        className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`}
      />
      {c.label}
    </Badge>
  )
}

function JobRow({
  job,
  isInFlight,
}: {
  job: ActivityJob
  isInFlight: boolean
}) {
  const duration = isInFlight
    ? formatDuration(job.createdAt)
    : formatDuration(job.createdAt, job.updatedAt)

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card/50 p-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {jobTypeLabel[job.type] ?? job.type}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <Link
            href={`/sites/${job.siteSlug}`}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {job.siteName}
          </Link>
          <StatusBadge status={job.status} />
        </div>

        {job.step && job.status === "processing" && (
          <p className="text-xs text-muted-foreground animate-pulse">
            {job.step}
          </p>
        )}

        {job.error && (
          <p className="text-xs text-destructive line-clamp-2">
            {job.error}
          </p>
        )}

        {job.imageErrors && (
          <p className="flex items-start gap-1 text-xs text-yellow-500 line-clamp-3">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              <span className="font-medium">Images:</span> {job.imageErrors}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            {isInFlight ? "Running for" : "Took"} {duration}
          </span>
          <span>·</span>
          <span>{new Date(job.createdAt).toLocaleString()}</span>
          {job.postId && job.status === "completed" && (
            <>
              <span>·</span>
              <Link
                href={`/content/${job.postId}`}
                className="text-primary hover:underline"
              >
                View post
              </Link>
            </>
          )}
          {job.publishedUrl && (
            <>
              <span>·</span>
              <a
                href={job.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Live URL
              </a>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {isInFlight && <CancelButton jobId={job.id} />}
        {job.status === "failed" && <RetryButton jobId={job.id} />}
      </div>
    </div>
  )
}

export default async function ActivityPage() {
  const { inFlight, recent } = await getJobActivity()

  return (
    <div className="space-y-6 max-w-4xl">
      <ActivityAutoRefresh enabled={inFlight.length > 0} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Activity className="h-7 w-7" />
            Activity
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Background jobs for content generation and publishing.
            {inFlight.length > 0 && " Auto-refreshing every 5 seconds."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RunProcessorButton />
          <ClearStaleButton />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2
              className={`h-4 w-4 ${inFlight.length > 0 ? "animate-spin text-primary" : "text-muted-foreground"}`}
            />
            In-flight ({inFlight.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inFlight.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No jobs running. Queue is idle.
            </p>
          ) : (
            inFlight.map((job) => (
              <JobRow key={job.id} job={job} isInFlight />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent (last 30)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent job history.
            </p>
          ) : (
            recent.map((job) => (
              <JobRow key={job.id} job={job} isInFlight={false} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
