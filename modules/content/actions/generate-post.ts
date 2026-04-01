"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { anthropic } from "@/lib/ai/client"
import {
  buildBlogGenerationPrompt,
  type BlogGenerationResult,
} from "@/lib/ai/prompts/blog-generation"
import { humanizeContent } from "../services/humanizer"
import {
  generateAndUploadImages,
  replaceImageMarkers,
} from "../services/image-generator"
import type { SiteProfile } from "@/modules/sites/types"

interface GeneratePostResult {
  success: boolean
  postId?: string
  error?: string
}

export async function generatePost(
  siteId: string,
  keywordId: string
): Promise<GeneratePostResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } })
  if (!keyword) return { success: false, error: "Keyword not found" }

  try {
    // Step 1: Generate blog content with Claude
    const prompt = buildBlogGenerationPrompt({
      siteNiche: site.niche ?? "unknown",
      siteAudience: site.audience ?? "unknown",
      siteTone: site.tone ?? "professional",
      siteTopics: (site.topics as string[]) ?? [],
      keyword: keyword.keyword,
      keywordIntent: keyword.intent,
      keywordCluster: keyword.cluster,
      searchVolume: keyword.searchVolume,
    })

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const textBlock = message.content.find((block) => block.type === "text")
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "No response from Claude" }
    }

    const blog = JSON.parse(textBlock.text) as BlogGenerationResult

    // Step 2: Create post record first (need ID for image storage path)
    const post = await prisma.post.create({
      data: {
        siteId,
        keywordId,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        metaTitle: blog.metaTitle,
        metaDesc: blog.metaDesc,
        status: "draft",
        generatedBy: "claude-sonnet",
        promptVersion: "v1",
      },
    })

    // Step 3: Humanize content via StealthGPT
    let finalContent = blog.content
    try {
      finalContent = await humanizeContent(blog.content, {
        keyword: keyword.keyword,
      })
    } catch (error) {
      console.error("StealthGPT humanization failed, using original:", error)
    }

    // Step 4: Generate images via Gemini
    let images: Awaited<ReturnType<typeof generateAndUploadImages>> = []
    try {
      images = await generateAndUploadImages(post.id, blog.imagePrompts)
      finalContent = replaceImageMarkers(finalContent, images)
    } catch (error) {
      console.error("Image generation failed, continuing without images:", error)
    }

    // Step 5: Update post with humanized content + images
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

    // Step 6: Mark keyword as used
    await prisma.keyword.update({
      where: { id: keywordId },
      data: { status: "used" },
    })

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
