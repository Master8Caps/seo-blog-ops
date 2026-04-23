"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"

export interface SetIndexNowVerifiedResult {
  success: boolean
  error?: string
}

export async function setIndexNowVerified(
  siteId: string,
  verified: boolean
): Promise<SetIndexNowVerifiedResult> {
  try {
    await prisma.site.update({
      where: { id: siteId },
      data: { indexNowVerified: verified },
    })
    revalidatePath("/settings/integrations/google")
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update IndexNow status",
    }
  }
}
