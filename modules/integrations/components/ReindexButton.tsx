"use client"

import { useTransition, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { manualReindex } from "@/modules/integrations/actions/manual-reindex"

export function ReindexButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  return (
    <button
      className={buttonVariants({ variant: "outline", size: "sm" })}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await manualReindex(postId)
          if (r.success) setDone(true)
          else alert(`Failed: ${r.error}`)
        })
      }
    >
      {done ? "Re-submitted ✓" : pending ? "Submitting…" : "Re-submit for indexing"}
    </button>
  )
}
