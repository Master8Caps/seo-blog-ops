"use server"

import { revalidatePath } from "next/cache"
import { syncSiteMetrics, type SyncResult } from "@/modules/integrations/services/gsc-sync"

export interface RefreshResult {
  success: boolean
  data?: SyncResult
  error?: string
}

export async function refreshSiteMetrics(
  siteId: string,
  siteSlug: string
): Promise<RefreshResult> {
  try {
    const data = await syncSiteMetrics(siteId)
    revalidatePath(`/sites/${siteSlug}/analytics`)
    revalidatePath("/analytics")
    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Refresh failed",
    }
  }
}
