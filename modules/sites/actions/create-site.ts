"use server"

// Allow up to 60s for crawling + AI analysis on Vercel
export const maxDuration = 60

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { createSiteSchema, type CreateSiteInput } from "../schemas"
import { crawlSite } from "../services/crawler"
import { analyzeSite } from "../services/analyzer"

interface CreateSiteResult {
  success: boolean
  siteId?: string
  error?: string
}

export async function createSite(
  input: CreateSiteInput
): Promise<CreateSiteResult> {
  const parsed = createSiteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { url, name, description } = parsed.data

  const existing = await prisma.site.findUnique({ where: { url } })
  if (existing) {
    return { success: false, error: "A site with this URL already exists" }
  }

  const site = await prisma.site.create({
    data: {
      url,
      name,
      description,
      onboardingStatus: "pending",
    },
  })

  revalidatePath("/sites")
  return { success: true, siteId: site.id }
}

export async function crawlAndAnalyzeSite(
  siteId: string
): Promise<CreateSiteResult> {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  await prisma.site.update({
    where: { id: siteId },
    data: { onboardingStatus: "crawling" },
  })

  try {
    const crawlResult = await crawlSite(site.url)
    if (crawlResult.pages.length === 0) {
      await prisma.site.update({
        where: { id: siteId },
        data: { onboardingStatus: "pending" },
      })
      return {
        success: false,
        error: "Could not crawl any pages. Check the URL and try again.",
      }
    }

    const analysis = await analyzeSite({
      url: site.url,
      description: site.description ?? undefined,
      pages: crawlResult.pages,
    })

    await prisma.site.update({
      where: { id: siteId },
      data: {
        niche: analysis.niche,
        audience: analysis.audience,
        tone: analysis.tone,
        topics: analysis.topics,
        seoProfile: JSON.parse(JSON.stringify(analysis)),
        onboardingStatus: "analyzed",
        lastCrawledAt: new Date(),
      },
    })

    revalidatePath(`/sites/${siteId}`)
    revalidatePath("/sites")
    return { success: true, siteId }
  } catch (error) {
    await prisma.site.update({
      where: { id: siteId },
      data: { onboardingStatus: "pending" },
    })
    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
