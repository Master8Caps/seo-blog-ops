// modules/publishing/actions/connect-site.ts
"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { encrypt, decrypt } from "@/lib/crypto"
import {
  testConnection as wpTestConnection,
  syncTaxonomy as wpSyncTaxonomy,
} from "@/modules/publishing/services/wordpress"
import {
  testConnection as apiTestConnection,
  syncMetadata as apiSyncMetadata,
  type ApiMetadata,
} from "@/modules/publishing/services/standard-api"
import { syncExternalPosts } from "@/modules/publishing/services/sync-external-posts"

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface ConnectResult {
  success: boolean
  error?: string
  categoryCount?: number
  tagCount?: number
  contextGroupCount?: number
  userName?: string
  postsCount?: number
  postsWarning?: string | null
}

// ---------------------------------------------------------------------------
// Standard API connection
// ---------------------------------------------------------------------------

/**
 * Test Standard API connection, fetch metadata, encrypt API key, and save.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Strip invisible Unicode chars that sneak in when pasting from notes
 * apps (Apple Notes, OneNote, Notion, Keep) — NBSP, zero-width spaces,
 * BOMs, directional marks. These survive .trim() and cause silent 401s.
 */
function normalizeApiKey(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u2028\u2029]/g, "")
    .replace(/\s+/g, "")
    .trim()
}

export async function testAndSyncApiConnection(
  siteId: string,
  apiKey: string
): Promise<ConnectResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  const trimmedKey = normalizeApiKey(apiKey)
  if (!trimmedKey) return { success: false, error: "API key is empty" }
  if (!UUID_REGEX.test(trimmedKey)) {
    return {
      success: false,
      error: `That doesn't look like a valid UUID (got ${trimmedKey.length} chars after cleaning). Check for typos, extra text, or paste directly from plain text — not from a notes app.`,
    }
  }

  const connResult = await apiTestConnection(site.url, trimmedKey)
  if (!connResult.success) {
    return { success: false, error: connResult.error }
  }

  const metadata = connResult.metadata!
  const existingConfig = (site.publishConfig as Record<string, unknown>) ?? {}

  const publishConfig = JSON.parse(JSON.stringify({
    apiKey: encrypt(trimmedKey),
    publishAsDraft: existingConfig.publishAsDraft ?? false,
    autoPublishOnApproval: existingConfig.autoPublishOnApproval ?? false,
    taxonomy: {
      categories: metadata.categories,
      tags: metadata.tags,
      context: metadata.context,
      lastSyncedAt: new Date().toISOString(),
    },
  }))

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishType: "api",
      publishConfig,
    },
  })

  // Also sync existing posts on the site for internal-link generation.
  // Failures here don't fail the connection — metadata sync already succeeded.
  let postsCount = 0
  let postsWarning: string | null = null

  try {
    const postsResult = await syncExternalPosts({
      id: site.id,
      publishType: "api",
      publishConfig: {
        siteUrl: site.url,
        apiKey: trimmedKey, // plaintext already in scope
      },
    })

    postsCount = postsResult.count
    if (!postsResult.ok) postsWarning = postsResult.error ?? "Unknown error"
  } catch (err) {
    postsWarning = err instanceof Error ? err.message : String(err)
  }

  revalidatePath(`/sites/${site.slug}`)
  revalidatePath(`/sites/${site.slug}/publishing`)

  return {
    success: true,
    categoryCount: metadata.categories.length,
    tagCount: metadata.tags.length,
    contextGroupCount: metadata.context.length,
    postsCount,
    postsWarning,
  }
}

/**
 * Re-sync metadata from a Standard API site using stored API key.
 */
export async function resyncApiMetadata(
  siteId: string
): Promise<{ success: boolean; error?: string; categoryCount?: number; tagCount?: number; contextGroupCount?: number }> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  const config = site.publishConfig as Record<string, unknown> | null
  if (!config?.apiKey) {
    return { success: false, error: "API key not configured" }
  }

  const apiKey = decrypt(config.apiKey as string)
  const metadata = await apiSyncMetadata(site.url, apiKey)

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishConfig: JSON.parse(JSON.stringify({
        ...config,
        taxonomy: {
          categories: metadata.categories,
          tags: metadata.tags,
          context: metadata.context,
          lastSyncedAt: new Date().toISOString(),
        },
      })),
    },
  })

  revalidatePath(`/sites/${site.slug}/publishing`)
  return {
    success: true,
    categoryCount: metadata.categories.length,
    tagCount: metadata.tags.length,
    contextGroupCount: metadata.context.length,
  }
}

// ---------------------------------------------------------------------------
// WordPress connection
// ---------------------------------------------------------------------------

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

  const connResult = await wpTestConnection(site.url, username, password)
  if (!connResult.success) {
    return { success: false, error: connResult.error }
  }

  let taxonomy
  try {
    taxonomy = await wpSyncTaxonomy(site.url, username, password)
  } catch (error) {
    return {
      success: false,
      error: `Connection works but failed to sync taxonomy: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }

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

  // Also sync existing posts on the site for internal-link generation.
  // Failures here don't fail the connection — metadata sync already succeeded.
  let postsCount = 0
  let postsWarning: string | null = null

  try {
    const postsResult = await syncExternalPosts({
      id: site.id,
      publishType: "wordpress",
      publishConfig: {
        siteUrl: site.url,
        username, // plaintext already in scope
        appPassword: password, // plaintext already in scope
      },
    })

    postsCount = postsResult.count
    if (!postsResult.ok) postsWarning = postsResult.error ?? "Unknown error"
  } catch (err) {
    postsWarning = err instanceof Error ? err.message : String(err)
  }

  revalidatePath(`/sites/${site.slug}`)
  revalidatePath(`/sites/${site.slug}/publishing`)

  return {
    success: true,
    categoryCount: taxonomy.categories.length,
    tagCount: taxonomy.tags.length,
    userName: connResult.user?.name,
    postsCount,
    postsWarning,
  }
}

// ---------------------------------------------------------------------------
// Shared actions
// ---------------------------------------------------------------------------

/**
 * Update publishing settings (toggles only, not credentials).
 */
export async function updatePublishingSettings(
  siteId: string,
  settings: {
    wpPublishAsDraft?: boolean
    publishAsDraft?: boolean
    autoPublishOnApproval?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }
  if (!site.publishType) {
    return { success: false, error: "Publishing not configured for this site" }
  }

  const config = (site.publishConfig as Record<string, unknown>) ?? {}

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishConfig: {
        ...config,
        ...(settings.wpPublishAsDraft !== undefined && { wpPublishAsDraft: settings.wpPublishAsDraft }),
        ...(settings.publishAsDraft !== undefined && { publishAsDraft: settings.publishAsDraft }),
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
  const taxonomy = await wpSyncTaxonomy(site.url, config.wpUsername as string, password)

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
 * Get the current publishing config for a site (with secrets masked).
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
    // WordPress fields
    wpUsername: (config?.wpUsername as string) ?? "",
    isWpConnected: !!(config?.wpUsername && config?.wpAppPassword),
    wpPublishAsDraft: (config?.wpPublishAsDraft as boolean) ?? false,
    // Standard API fields
    isApiConnected: !!config?.apiKey,
    publishAsDraft: (config?.publishAsDraft as boolean) ?? false,
    // Shared
    autoPublishOnApproval: (config?.autoPublishOnApproval as boolean) ?? false,
    taxonomy: config?.taxonomy as {
      categories: { id?: number; slug: string; name: string }[]
      tags: { id?: number; slug: string; name: string }[] | string[]
      context?: { label: string; description: string; items: { slug: string; name: string }[] }[]
      lastSyncedAt: string
    } | undefined,
    siteUrl: site.url,
  }
}

/**
 * Disconnect publishing — clear publishType and config.
 */
export async function disconnectPublishing(
  siteId: string
): Promise<{ success: boolean; error?: string }> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  await prisma.site.update({
    where: { id: siteId },
    data: {
      publishType: null,
      publishConfig: Prisma.JsonNull,
    },
  })

  revalidatePath(`/sites/${site.slug}/publishing`)
  return { success: true }
}
