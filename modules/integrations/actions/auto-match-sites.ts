"use server"

import { revalidatePath } from "next/cache"
import {
  autoMatchSitesToGscProperties,
  type AutoMatchResult,
} from "@/modules/integrations/services/gsc-auto-match"

export interface AutoMatchActionResult {
  success: boolean
  data?: AutoMatchResult
  error?: string
}

export async function runAutoMatch(): Promise<AutoMatchActionResult> {
  try {
    const data = await autoMatchSitesToGscProperties()
    revalidatePath("/settings/integrations/google")
    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Auto-match failed",
    }
  }
}
