// modules/publishing/actions/connect-site.ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { encrypt, decrypt } from "@/lib/crypto"
import {
  testConnection,
  syncTaxonomy,
} from "@/modules/publishing/services/wordpress"

interface ConnectResult {
  success: boolean
  error?: string
  categoryCount?: number
  tagCount?: number
  userName?: string
}

/**
 * Test WordPress connection, sync taxonomy, encrypt credentials, and save.
 */
export async function testAndSyncConnection(
  siteId: string,
  username: string,
  password: string
): Promise<ConnectResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  // Test connection
  const connResult = await testConnection(site.url, username, password)
  if (!connResult.success) {
    return { success: false, error: connResult.error }
  }

  // Sync taxonomy
  let taxonomy
  try {
    taxonomy = await syncTaxonomy(site.url, username, password)
  } catch (error) {
    return {
      success: false,
      error: `Connection works but failed to sync taxonomy: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }

  // Build publishConfig — preserve existing settings if reconnecting
  const existingConfig = (site.publishConfig as Record<string, unknown>) ?? {}

  const publishConfig = {
    wpUsername: username,
    wpAppPassword: encrypt(password),
    wpPublishAsDraft: existingConfig.wpPublishAsDraft ?? false,
    autoPublishOnApproval: existingConfig.autoPublishOnApproval ?? false,
    taxonomy: {
      categories: taxonomy.categories,
      tags: taxonomy.tags,
      lastSyncedAt: new Date().toISOString(),
    },
  }

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishType: "wordpress",
      publishConfig,
    },
  })

  revalidatePath(`/sites/${site.slug}`)
  revalidatePath(`/sites/${site.slug}/publishing`)

  return {
    success: true,
    categoryCount: taxonomy.categories.length,
    tagCount: taxonomy.tags.length,
    userName: connResult.user?.name,
  }
}

/**
 * Update publishing settings (toggles only, not credentials).
 */
export async function updatePublishingSettings(
  siteId: string,
  settings: {
    wpPublishAsDraft?: boolean
    autoPublishOnApproval?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }
  if (site.publishType !== "wordpress") {
    return { success: false, error: "WordPress not configured for this site" }
  }

  const config = (site.publishConfig as Record<string, unknown>) ?? {}

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishConfig: {
        ...config,
        ...(settings.wpPublishAsDraft !== undefined && { wpPublishAsDraft: settings.wpPublishAsDraft }),
        ...(settings.autoPublishOnApproval !== undefined && { autoPublishOnApproval: settings.autoPublishOnApproval }),
      },
    },
  })

  revalidatePath(`/sites/${site.slug}/publishing`)
  return { success: true }
}

/**
 * Re-sync taxonomy from WordPress using stored credentials.
 */
export async function resyncTaxonomy(
  siteId: string
): Promise<{ success: boolean; error?: string; categoryCount?: number; tagCount?: number }> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  const config = site.publishConfig as Record<string, unknown> | null
  if (!config?.wpUsername || !config?.wpAppPassword) {
    return { success: false, error: "WordPress credentials not configured" }
  }

  const password = decrypt(config.wpAppPassword as string)
  const taxonomy = await syncTaxonomy(site.url, config.wpUsername as string, password)

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishConfig: {
        ...config,
        taxonomy: {
          categories: taxonomy.categories,
          tags: taxonomy.tags,
          lastSyncedAt: new Date().toISOString(),
        },
      },
    },
  })

  revalidatePath(`/sites/${site.slug}/publishing`)
  return {
    success: true,
    categoryCount: taxonomy.categories.length,
    tagCount: taxonomy.tags.length,
  }
}

/**
 * Get the current publishing config for a site (with password masked).
 */
export async function getPublishingConfig(siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      url: true,
      publishType: true,
      publishConfig: true,
    },
  })
  if (!site) return null

  const config = site.publishConfig as Record<string, unknown> | null

  return {
    publishType: site.publishType,
    wpUsername: (config?.wpUsername as string) ?? "",
    isConnected: !!(config?.wpUsername && config?.wpAppPassword),
    wpPublishAsDraft: (config?.wpPublishAsDraft as boolean) ?? false,
    autoPublishOnApproval: (config?.autoPublishOnApproval as boolean) ?? false,
    taxonomy: config?.taxonomy as {
      categories: { id: number; name: string; slug: string }[]
      tags: { id: number; name: string; slug: string }[]
      lastSyncedAt: string
    } | undefined,
    siteUrl: site.url,
  }
}
