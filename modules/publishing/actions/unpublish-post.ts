"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/crypto"
import { unpublishArticle as apiUnpublishArticle } from "@/modules/publishing/services/standard-api"

interface UnpublishResult {
  success: boolean
  error?: string
}

/**
 * Unpublish a post — deletes it from the target site and resets our
 * local record back to "approved" so it can be edited and re-published.
 */
export async function unpublishPost(postId: string): Promise<UnpublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { site: true },
  })

  if (!post) return { success: false, error: "Post not found" }
  if (post.status !== "published") {
    return { success: false, error: "Post is not published" }
  }
  if (!post.externalId) {
    return { success: false, error: "No external ID on record — can't identify it on the target" }
  }

  const site = post.site
  const config = site.publishConfig as Record<string, unknown> | null

  try {
    if (site.publishType === "api") {
      if (!config?.apiKey) {
        return { success: false, error: "API key not configured" }
      }
      const apiKey = decrypt(config.apiKey as string)
      await apiUnpublishArticle(site.url, apiKey, post.externalId)
    } else if (site.publishType === "wordpress") {
      return {
        success: false,
        error: "Unpublish for WordPress isn't wired up yet — delete the post manually on the target and then use Delete here.",
      }
    } else {
      return {
        success: false,
        error: `Unknown publish type: ${site.publishType ?? "none"}`,
      }
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "approved",
        publishedUrl: null,
        publishedAt: null,
        externalId: null,
      },
    })

    revalidatePath(`/content/${post.id}`)
    revalidatePath(`/sites/${site.slug}/content`)
    revalidatePath("/content")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Unpublish failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
