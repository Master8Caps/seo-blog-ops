// modules/publishing/actions/publish-post.ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/crypto"
import {
  uploadMedia as wpUploadMedia,
  createPost as wpCreatePost,
} from "@/modules/publishing/services/wordpress"
import {
  publishArticle as apiPublishArticle,
  uploadMedia as apiUploadMedia,
} from "@/modules/publishing/services/standard-api"
import { classifyPost } from "@/modules/publishing/services/classify-post"

interface PublishResult {
  success: boolean
  error?: string
  publishedUrl?: string
}

async function updateJobProgress(jobId: string | undefined, step: string) {
  if (!jobId) return
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { payload: { step } },
  })
}

/**
 * Publish a post. Routes to the correct adapter based on site.publishType.
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

  if (site.publishType === "wordpress") {
    return publishToWordPress(post, site, jobId)
  }

  if (site.publishType === "api") {
    return publishToStandardApi(post, site, jobId)
  }

  return { success: false, error: `Publishing not configured for this site (type: ${site.publishType ?? "none"})` }
}

// ---------------------------------------------------------------------------
// Standard API publish flow
// ---------------------------------------------------------------------------

async function publishToStandardApi(
  post: { id: string; title: string; slug: string; content: string; excerpt: string | null; featuredImg: string | null; category: string | null; tags: string | null },
  site: { id: string; slug: string; url: string; publishConfig: unknown },
  jobId?: string
): Promise<PublishResult> {
  const config = site.publishConfig as Record<string, unknown>
  if (!config?.apiKey) {
    return { success: false, error: "API key not configured for this site" }
  }

  const apiKey = decrypt(config.apiKey as string)
  const publishAsDraft = (config.publishAsDraft as boolean) ?? false
  const taxonomy = config.taxonomy as {
    categories: { slug: string; name: string }[]
    tags: string[]
    context: { label: string; description: string; items: { slug: string; name: string }[] }[]
  } | undefined

  try {
    // Step 1: Classify post into site taxonomy
    let category = post.category
    let tags = post.tags

    if (taxonomy && taxonomy.categories.length > 0 && !category) {
      await updateJobProgress(jobId, "Classifying post into site taxonomy...")

      const contextStr = taxonomy.context
        ?.map((g) => `${g.label}: ${g.items.map((i) => i.name).join(", ")}`)
        .join("\n")

      const tagOptions = taxonomy.tags.map((t) => ({ slug: t, name: t }))
      const classification = await classifyPost(
        post.title,
        post.content,
        taxonomy.categories,
        tagOptions,
        contextStr
      )
      category = classification.category
      tags = classification.tags.join(",")

      await prisma.post.update({
        where: { id: post.id },
        data: { category, tags },
      })
    }

    // Step 2: Upload featured image if the site supports it
    let featuredImageUrl = post.featuredImg

    if (post.featuredImg) {
      await updateJobProgress(jobId, "Uploading featured image...")
      try {
        const imgRes = await fetch(post.featuredImg)
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
          const filename = `${post.slug}-featured.png`
          featuredImageUrl = await apiUploadMedia(site.url, apiKey, imgBuffer, filename)
        }
      } catch (error) {
        console.error("Featured image upload failed, using original URL:", error)
      }
    }

    // Step 3: Convert markdown to HTML and publish
    await updateJobProgress(jobId, "Publishing article...")
    const htmlContent = markdownToHtml(post.content)

    const result = await apiPublishArticle(site.url, apiKey, {
      slug: post.slug,
      title: post.title,
      content: htmlContent,
      excerpt: post.excerpt ?? undefined,
      category: category ?? undefined,
      featuredImage: featuredImageUrl ?? undefined,
      tags: tags ?? undefined,
      published: !publishAsDraft,
    })

    // Step 4: Update our post record
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "published",
        externalId: result.slug,
        publishedUrl: result.publishedUrl,
        publishedAt: new Date(),
      },
    })

    revalidatePaths(post.id, site.slug)
    return { success: true, publishedUrl: result.publishedUrl }
  } catch (error) {
    return {
      success: false,
      error: `Publishing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ---------------------------------------------------------------------------
// WordPress publish flow
// ---------------------------------------------------------------------------

async function publishToWordPress(
  post: { id: string; title: string; slug: string; content: string; featuredImg: string | null; category: string | null; tags: string | null },
  site: { id: string; slug: string; url: string; publishConfig: unknown },
  jobId?: string
): Promise<PublishResult> {
  const config = site.publishConfig as Record<string, unknown>
  if (!config?.wpUsername || !config?.wpAppPassword) {
    return { success: false, error: "WordPress credentials not found" }
  }

  const wpUsername = config.wpUsername as string
  const wpPassword = decrypt(config.wpAppPassword as string)
  const wpPublishAsDraft = (config.wpPublishAsDraft as boolean) ?? false
  const taxonomy = config.taxonomy as {
    categories: { id: number; name: string; slug: string }[]
    tags: { id: number; name: string; slug: string }[]
  } | undefined

  try {
    // Step 1: Classify post into WordPress taxonomy
    let categorySlug = post.category
    let tagSlugs = post.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []

    if (taxonomy && taxonomy.categories.length > 0 && !categorySlug) {
      await updateJobProgress(jobId, "Classifying post into WordPress taxonomy...")

      const catOptions = taxonomy.categories.map((c) => ({ slug: c.slug, name: c.name }))
      const tagOptions = taxonomy.tags.map((t) => ({ slug: t.slug, name: t.name }))
      const classification = await classifyPost(post.title, post.content, catOptions, tagOptions)
      categorySlug = classification.category
      tagSlugs = classification.tags

      await prisma.post.update({
        where: { id: post.id },
        data: {
          category: categorySlug,
          tags: tagSlugs.join(","),
        },
      })
    }

    // Resolve slugs → integer IDs from cached taxonomy
    const categoryId = taxonomy?.categories.find((c) => c.slug === categorySlug)?.id
    const tagIds = tagSlugs
      .map((slug) => taxonomy?.tags.find((t) => t.slug === slug)?.id)
      .filter((id): id is number => id !== undefined)

    // Step 2: Upload featured image
    let featuredMediaId: number | undefined

    if (post.featuredImg) {
      await updateJobProgress(jobId, "Uploading featured image to WordPress...")
      try {
        const imgRes = await fetch(post.featuredImg)
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
          const filename = `${post.slug}-featured.png`
          const media = await wpUploadMedia(site.url, wpUsername, wpPassword, imgBuffer, filename)
          featuredMediaId = media.id
        }
      } catch (error) {
        console.error("Featured image upload failed, publishing without image:", error)
      }
    }

    // Step 3: Convert markdown to HTML and publish
    await updateJobProgress(jobId, "Publishing post to WordPress...")
    const htmlContent = markdownToHtml(post.content)

    const wpPost = await wpCreatePost(site.url, wpUsername, wpPassword, {
      title: post.title,
      content: htmlContent,
      status: wpPublishAsDraft ? "draft" : "publish",
      featured_media: featuredMediaId,
      categories: categoryId ? [categoryId] : undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
    })

    // Step 4: Update our post record
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "published",
        externalId: String(wpPost.id),
        publishedUrl: wpPost.link,
        publishedAt: new Date(),
      },
    })

    revalidatePaths(post.id, site.slug)
    return { success: true, publishedUrl: wpPost.link }
  } catch (error) {
    return {
      success: false,
      error: `Publishing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function revalidatePaths(postId: string, siteSlug: string) {
  revalidatePath(`/content/${postId}`)
  revalidatePath(`/sites/${siteSlug}/content`)
  revalidatePath("/content")
}

function markdownToHtml(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, "</p>\n<p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/<p>(<h[1-3]>)/g, "$1")
    .replace(/(<\/h[1-3]>)<\/p>/g, "$1")
    .replace(/<p>(<ul>)/g, "$1")
    .replace(/(<\/ul>)<\/p>/g, "$1")
    .replace(/<p><\/p>/g, "")
}
