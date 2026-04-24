"use client"

import { useState, useTransition } from "react"
import { buttonVariants } from "@/components/ui/button"
import { refreshSiteMetrics } from "@/modules/integrations/actions/refresh-site-metrics"

export function RefreshAnalyticsButton({ siteId, siteSlug }: { siteId: string; siteSlug: string }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null)

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span
          className={
            message.tone === "error"
              ? "text-xs text-red-700"
              : message.tone === "warn"
              ? "text-xs text-amber-700"
              : "text-xs text-muted-foreground"
          }
        >
          {message.text}
        </span>
      )}
      <button
        className={buttonVariants({ variant: "outline", size: "sm" })}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null)
            const r = await refreshSiteMetrics(siteId, siteSlug)
            if (!r.success) {
              setMessage({ tone: "error", text: r.error ?? "Refresh failed" })
              return
            }
            if (r.data?.skipped) {
              setMessage({ tone: "warn", text: r.data.reason ?? "Sync skipped" })
              return
            }
            const d = r.data
            setMessage({
              tone: "ok",
              text: `Synced: ${d?.daily ?? 0}d · ${d?.pages ?? 0}p · ${d?.queries ?? 0}q`,
            })
          })
        }
      >
        {pending ? "Syncing…" : "Refresh now"}
      </button>
    </div>
  )
}
