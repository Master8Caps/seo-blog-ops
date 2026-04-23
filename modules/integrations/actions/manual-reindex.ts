"use server"

import { revalidatePath } from "next/cache"
import { indexPublishedPost, type IndexingPipelineResult } from "@/modules/integrations/services/indexing"

export interface ManualReindexResult {
  success: boolean
  data?: IndexingPipelineResult
  error?: string
}

export async function manualReindex(postId: string): Promise<ManualReindexResult> {
  try {
    const data = await indexPublishedPost(postId)
    revalidatePath(`/content/${postId}`)
    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Reindex failed",
    }
  }
}
