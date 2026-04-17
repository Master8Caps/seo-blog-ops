"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/db/prisma"
import { anthropic } from "@/lib/ai/client"
import {
  buildKeywordGroupSelectionPrompt,
  buildBlogGenerationPrompt,
  type KeywordGroupSelectionResult,
  type BlogGenerationResult,
  type KeywordForBlog,
} from "@/lib/ai/prompts/blog-generation"
import { parseAIJson } from "@/lib/ai/parse-json"
import { humanizeContent } from "../services/humanizer"
import {
  generateAndUploadImages,
  replaceImageMarkers,
} from "../services/image-generator"

interface GeneratePostResult {
  success: boolean
  postId?: string
  error?: string
}

/**
 * Merge partial updates into the job's JSON payload.
 * Every caller here reads-then-writes because Prisma doesn't do JSONB merge
 * natively and we want terminal state (imageStats, imageErrors) to survive
 * subsequent progress updates and the final completion write in the queue processor.
 */
async function mergeJobPayload(
  jobId: string | undefined,
  updates: Record<string, Prisma.InputJsonValue | undefined>
) {
  if (!jobId) return
  const current = await prisma.jobQueue.findUnique({
    where: { id: jobId },
    select: { payload: true },
  })
  const existing =
    current?.payload && typeof current.payload === "object"
      ? (current.payload as Prisma.JsonObject)
      : {}
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { payload: { ...existing, ...updates } as Prisma.InputJsonValue },
  })
}

async function updateJobProgress(jobId: string | undefined, step: string) {
  await mergeJobPayload(jobId, { step })
}

/**
 * Generate a blog post for a site. AI automatically picks 2-3 approved
 * keywords that work well together, writes the post targeting all of them,
 * humanizes via StealthGPT, generates images, and saves as draft.
 */
export async function generatePost(
  siteId: string,
  jobId?: string
): Promise<GeneratePostResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  // Get all approved keywords for this site
  const approvedKeywords = await prisma.keyword.findMany({
    where: { siteId, status: "approved" },
    orderBy: { searchVolume: "desc" },
  })

  if (approvedKeywords.length === 0) {
    return { success: false, error: "No approved keywords available. Run research first." }
  }

  try {
    // Step 1: AI picks 2-3 keywords that work well together
    await updateJobProgress(jobId, "Selecting best keywords...")
    let primaryKw: KeywordForBlog
    let secondaryKws: KeywordForBlog[] = []

    if (approvedKeywords.length === 1) {
      // Only one keyword, use it as primary with no secondaries
      primaryKw = approvedKeywords[0]
    } else {
      const selectionPrompt = buildKeywordGroupSelectionPrompt({
        siteNiche: site.niche ?? "unknown",
        siteAudience: site.audience ?? "unknown",
        keywords: approvedKeywords.map((k) => ({
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          intent: k.intent,
          cluster: k.cluster,
        })),
      })

      const selectionMsg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: selectionPrompt }],
      })

      const selectionText = selectionMsg.content.find((b) => b.type === "text")
      if (!selectionText || selectionText.type !== "text") {
        return { success: false, error: "AI keyword selection failed" }
      }

      const selection = parseAIJson<KeywordGroupSelectionResult>(selectionText.text) as KeywordGroupSelectionResult

      // Match selected keywords back to DB records
      const primaryMatch = approvedKeywords.find(
        (k) => k.keyword.toLowerCase() === selection.primary.toLowerCase()
      )
      if (!primaryMatch) {
        // Fallback: use highest volume keyword
        primaryKw = approvedKeywords[0]
      } else {
        primaryKw = primaryMatch
      }

      secondaryKws = selection.secondary
        .map((s) =>
          approvedKeywords.find(
            (k) => k.keyword.toLowerCase() === s.toLowerCase()
          )
        )
        .filter((k): k is NonNullable<typeof k> => k != null && k.id !== primaryKw.id)
    }

    // Step 2: Generate blog content with Claude
    await updateJobProgress(jobId, "Writing blog content with AI...")
    const blogPrompt = buildBlogGenerationPrompt({
      siteNiche: site.niche ?? "unknown",
      siteAudience: site.audience ?? "unknown",
      siteTone: site.tone ?? "professional",
      siteTopics: (site.topics as string[]) ?? [],
      primaryKeyword: primaryKw,
      secondaryKeywords: secondaryKws,
    })

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: blogPrompt }],
    })

    const textBlock = message.content.find((block) => block.type === "text")
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "No response from Claude" }
    }

    const blog = parseAIJson<BlogGenerationResult>(textBlock.text) as BlogGenerationResult

    // Step 3: Create post record (linked to primary keyword)
    await updateJobProgress(jobId, "Saving draft post...")
    const post = await prisma.post.create({
      data: {
        siteId,
        keywordId: primaryKw.id,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        metaTitle: blog.metaTitle,
        metaDesc: blog.metaDesc,
        status: "draft",
        generatedBy: "claude-sonnet",
        promptVersion: "v2",
      },
    })

    // Step 4: Humanize content via StealthGPT
    await updateJobProgress(jobId, "Humanizing content via StealthGPT...")
    let finalContent = blog.content
    try {
      finalContent = await humanizeContent(blog.content, {
        keyword: primaryKw.keyword,
        additionalKeywords: secondaryKws.map((k) => k.keyword),
      })
    } catch (error) {
      console.error("StealthGPT humanization failed, using original:", error)
    }

    // Step 5: Generate images via Gemini
    await updateJobProgress(jobId, "Generating images with Gemini...")
    const promptCount = Array.isArray(blog.imagePrompts)
      ? blog.imagePrompts.length
      : 0
    console.info(
      `[generate-post] post=${post.id} step=images prompts=${promptCount}`
    )
    let images: Awaited<ReturnType<typeof generateAndUploadImages>>["images"] = []
    let imageErrors: string[] = []
    try {
      if (!Array.isArray(blog.imagePrompts)) {
        throw new Error(
          `imagePrompts missing from Claude response (got ${typeof blog.imagePrompts})`
        )
      }
      const result = await generateAndUploadImages(post.id, blog.imagePrompts)
      images = result.images
      imageErrors = result.errors
    } catch (error) {
      imageErrors = [error instanceof Error ? error.message : "Unknown error"]
    }

    console.info(
      `[generate-post] post=${post.id} images generated=${images.length} errors=${imageErrors.length}`
    )

    if (imageErrors.length > 0) {
      console.error(
        `[generate-post] post=${post.id} image errors: ${imageErrors.join(" | ")}`
      )
    }

    // ALWAYS surface image stats on the job payload so /activity reflects
    // reality even when step 5 silently produced zero images.
    await mergeJobPayload(jobId, {
      step: "Finalizing post...",
      imageStats: {
        prompts: promptCount,
        generated: images.length,
        errors: imageErrors.length,
      },
      imageErrors:
        imageErrors.length > 0 ? imageErrors.join(" | ") : undefined,
    })

    finalContent = replaceImageMarkers(finalContent, images)
    // Strip any markers that didn't get resolved so previews don't render broken images
    finalContent = finalContent
      .replace(/!\[featured\]\(IMAGE_FEATURED\)\s*\n?/g, "")
      .replace(/!\[section\]\(IMAGE_[123]\)\s*\n?/g, "")

    // Step 6: Update post with humanized content + images
    await updateJobProgress(jobId, "Finalizing post...")
    await prisma.post.update({
      where: { id: post.id },
      data: {
        content: finalContent,
        humanized: finalContent !== blog.content,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        images: images.length > 0 ? (images as any) : undefined,
        featuredImg: images.find((i) => i.section === "featured")?.url ?? null,
      },
    })

    // Keywords stay "approved" — they can be reused across multiple posts.
    // Usage is tracked through the Post → Keyword relation.

    revalidatePath(`/sites/${site.slug}`)
    revalidatePath(`/sites/${site.slug}/content`)
    revalidatePath("/content")
    return { success: true, postId: post.id }
  } catch (error) {
    return {
      success: false,
      error: `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
