"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/crypto"
import { syncExternalPosts } from "../services/sync-external-posts"

export interface ResyncResult {
  ok: boolean
  count: number
  error?: string
}

export async function resyncExternalPosts(siteId: string): Promise<ResyncResult> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, slug: true, url: true, publishType: true, publishConfig: true },
  })
  if (!site) {
    return { ok: false, count: 0, error: "Site not found" }
  }
  if (!site.publishType || !site.publishConfig) {
    return { ok: false, count: 0, error: "Site has no publishing connection" }
  }

  // Decrypt + reshape publishConfig for the orchestrator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stored = site.publishConfig as any

  let decryptedConfig: Record<string, string>
  try {
    if (site.publishType === "wordpress") {
      decryptedConfig = {
        siteUrl: site.url,
        username: stored.wpUsername ?? "",
        appPassword: decrypt(stored.wpAppPassword ?? ""),
      }
    } else if (site.publishType === "api") {
      decryptedConfig = {
        siteUrl: site.url,
        apiKey: decrypt(stored.apiKey ?? ""),
      }
    } else {
      return { ok: false, count: 0, error: `Unknown publishType: ${site.publishType}` }
    }
  } catch (err) {
    return {
      ok: false,
      count: 0,
      error: `Failed to decrypt publish config: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  const result = await syncExternalPosts({
    id: site.id,
    publishType: site.publishType,
    publishConfig: decryptedConfig,
  })

  revalidatePath(`/sites/${site.slug}/publishing`)
  return result
}
