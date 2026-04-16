"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Refreshes the activity page every 5s while any jobs are in-flight.
 * Stops polling when the queue is idle to avoid unnecessary DB hits.
 */
export function ActivityAutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [enabled, router])

  return null
}
