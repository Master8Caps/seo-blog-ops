"use server"

import { revalidatePath } from "next/cache"
import { clearGoogleAuth, _resetTokenCache } from "@/lib/google/auth"

export interface DisconnectResult {
  success: boolean
  error?: string
}

export async function disconnectGoogle(): Promise<DisconnectResult> {
  try {
    await clearGoogleAuth()
    _resetTokenCache()
    revalidatePath("/settings/integrations/google")
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to disconnect Google",
    }
  }
}
