"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"

export interface UpdateGscPropertyResult {
  success: boolean
  error?: string
}

export async function updateSiteGscProperty(
  siteId: string,
  gscProperty: string | null
): Promise<UpdateGscPropertyResult> {
  try {
    await prisma.site.update({
      where: { id: siteId },
      data: { gscProperty },
    })
    revalidatePath("/settings/integrations/google")
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update GSC property",
    }
  }
}
