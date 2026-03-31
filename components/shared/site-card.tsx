import Link from "next/link"
import { Globe, FileText, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SiteCardProps {
  id: string
  name: string
  url: string
  niche?: string | null
  onboardingStatus: string
  autopilot: boolean
  postCount: number
  keywordCount: number
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  crawling: { label: "Crawling...", variant: "outline" },
  analyzed: { label: "Analyzed", variant: "default" },
  ready: { label: "Ready", variant: "default" },
}

export function SiteCard({
  id,
  name,
  url,
  niche,
  onboardingStatus,
  autopilot,
  postCount,
  keywordCount,
}: SiteCardProps) {
  const status = statusConfig[onboardingStatus] ?? statusConfig.pending

  return (
    <Link
      href={`/sites/${id}`}
      className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">{url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {autopilot && (
            <Badge variant="outline" className="text-xs">
              Autopilot
            </Badge>
          )}
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
        </div>
      </div>

      {niche && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-1">
          {niche}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {postCount} posts
        </span>
        <span className="flex items-center gap-1">
          <Search className="h-3.5 w-3.5" />
          {keywordCount} keywords
        </span>
      </div>
    </Link>
  )
}
