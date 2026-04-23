"use client"

import { useTransition } from "react"
import { buttonVariants } from "@/components/ui/button"
import { refreshSiteMetrics } from "@/modules/integrations/actions/refresh-site-metrics"

export function RefreshAnalyticsButton({ siteId, siteSlug }: { siteId: string; siteSlug: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      className={buttonVariants({ variant: "outline", size: "sm" })}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshSiteMetrics(siteId, siteSlug)
        })
      }
    >
      {pending ? "Syncing…" : "Refresh now"}
    </button>
  )
}
