"use client"

import { useState, useTransition } from "react"
import { RefreshCw, X, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  retryJob,
  clearStaleJobs,
  forceFailJob,
} from "@/modules/content/actions/get-activity"

export function RetryButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await retryJob(jobId)
        })
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5">Retry</span>
    </Button>
  )
}

export function CancelButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this job? It will be marked as failed.")) return
        startTransition(async () => {
          await forceFailJob(jobId)
        })
      }}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5">Cancel</span>
    </Button>
  )
}

export function ClearStaleButton() {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await clearStaleJobs()
            setMessage(
              result.reaped === 0
                ? "No stale jobs found."
                : `Cleared ${result.reaped} stale job${result.reaped === 1 ? "" : "s"}.`
            )
          })
        }
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        <span className="ml-1.5">Clear stale jobs</span>
      </Button>
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  )
}
