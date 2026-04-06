// modules/publishing/actions/publish-post.ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/crypto"
import {
  uploadMedia,
  createPost as wpCreatePost,
} from "@/modules/publishing/services/wordpress"
import { classifyPost } from "@/modules/publishing/services/classify-post"

interface PublishResult {
  success: boolean
  error?: string
  publishedUrl?: string
}

/**
 * Update the job's payload with a progress step.
 */
async function updateJobProgress(jobId: string | undefined, step: string) {
  if (!jobId) return
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { payload: { step } },
  })
}

/**
 * Publish a post to WordPress. Handles image upload, taxonomy classification,
 * and post creation.
 */
export async function publishPost(
  postId: string,
  jobId?: string
): Promise<PublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { site: true },
  })

  if (!post) return { success: false, error: "Post not found" }
  if (post.status === "published") return { success: false, error: "Post is already published" }

  const site = post.site
  if (site.publishType !== "wordpress") {
    return { success: false, error: "WordPress publishing not configured for this site" }
  }

  const config = site.publishConfig as Record<string, unknown>
  if (!config?.wpUsername || !config?.wpAppPassword) {
    return { success: false, error: "WordPress credentials not found" }
  }

  const wpUsername = config.wpUsername as string
  const wpPassword = decrypt(config.wpAppPassword as string)
  const wpPublishAsDraft = (config.wpPublishAsDraft as boolean) ?? false
  const taxonomy = config.taxonomy as {
    categories: { id: number; name: string }[]
    tags: { id: number; name: string }[]
  } | undefined

  try {
    // Step 1: Classify post into WordPress taxonomy
    let categoryId: number | undefined
    let tagIds: number[] = []

    if (taxonomy && taxonomy.categories.length > 0) {
      await updateJobProgress(jobId, "Classifying post into WordPress taxonomy...")

      // Use existing classification if already set, otherwise run AI
      if (post.wpCategoryId) {
        categoryId = post.wpCategoryId
        tagIds = (post.wpTagIds as number[]) ?? []
      } else {
        const classification = await classifyPost(
          post.title,
          post.content,
          taxonomy.categories,
          taxonomy.tags
        )
        categoryId = classification.categoryId
        tagIds = classification.tagIds

        // Save classification to post
        await prisma.post.update({
          where: { id: postId },
          data: {
            wpCategoryId: categoryId,
            wpTagIds: tagIds,
          },
        })
      }
    }

    // Step 2: Upload featured image if exists
    let featuredMediaId: number | undefined

    if (post.featuredImg) {
      await updateJobProgress(jobId, "Uploading featured image to WordPress...")
      try {
        const imgRes = await fetch(post.featuredImg)
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
          const filename = `${post.slug}-featured.png`
          const media = await uploadMedia(site.url, wpUsername, wpPassword, imgBuffer, filename)
          featuredMediaId = media.id
        }
      } catch (error) {
        console.error("Featured image upload failed, publishing without image:", error)
      }
    }

    // Step 3: Convert markdown to HTML for WordPress
    await updateJobProgress(jobId, "Publishing post to WordPress...")
    const htmlContent = markdownToWordPressHtml(post.content)

    // Step 4: Create the post on WordPress
    const wpPost = await wpCreatePost(site.url, wpUsername, wpPassword, {
      title: post.title,
      content: htmlContent,
      status: wpPublishAsDraft ? "draft" : "publish",
      featured_media: featuredMediaId,
      categories: categoryId ? [categoryId] : undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
    })

    // Step 5: Update our post record
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "published",
        externalId: String(wpPost.id),
        publishedUrl: wpPost.link,
        publishedAt: new Date(),
      },
    })

    revalidatePath(`/content/${postId}`)
    revalidatePath(`/sites/${site.slug}/content`)
    revalidatePath("/content")

    return { success: true, publishedUrl: wpPost.link }
  } catch (error) {
    return {
      success: false,
      error: `Publishing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Convert markdown content to WordPress-compatible HTML.
 */
function markdownToWordPressHtml(md: string): string {
  return md
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Paragraphs — double newlines become paragraph breaks
    .replace(/\n\n/g, "</p>\n<p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    // Clean up empty paragraphs around block elements
    .replace(/<p>(<h[1-3]>)/g, "$1")
    .replace(/(<\/h[1-3]>)<\/p>/g, "$1")
    .replace(/<p>(<ul>)/g, "$1")
    .replace(/(<\/ul>)<\/p>/g, "$1")
    .replace(/<p><\/p>/g, "")
}
