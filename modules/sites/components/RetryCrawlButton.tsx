"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { crawlAndAnalyzeSite } from "@/modules/sites/actions/create-site"

interface Props {
  siteId: string
  status: string
  lastCrawledAt: Date | null
}

function minutesSince(date: Date | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / 60000)
}

export function RetryCrawlButton({ siteId, status, lastCrawledAt }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (status === "analyzed" || status === "ready") return null

  const mins = minutesSince(lastCrawledAt)
  const isStuck = status === "crawling" && (mins === null || mins >= 5)

  const tone = status === "crawling" && !isStuck ? "info" : "warn"
  const heading =
    status === "crawling" && !isStuck
      ? "Crawl in progress"
      : status === "crawling"
      ? "Crawl appears stuck"
      : "Site not yet analyzed"

  const subtext =
    status === "crawling" && !isStuck
      ? "Can take 3–4 min for sites with many pages. Retry if it doesn't finish soon."
      : status === "crawling"
      ? `Has been crawling for ${mins ?? "?"} min — the serverless function likely timed out.`
      : "The initial crawl hasn't completed. Retry to generate the SEO profile."

  return (
    <div
      className={
        tone === "warn"
          ? "rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3"
          : "rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3"
      }
    >
      <div>
        <p className="text-sm font-medium text-foreground">{heading}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const r = await crawlAndAnalyzeSite(siteId)
            if (!r.success) {
              setError(r.error ?? "Retry failed")
              return
            }
            router.refresh()
          })
        }}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Retrying…
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry crawl &amp; analyze
          </>
        )}
      </Button>
    </div>
  )
}
