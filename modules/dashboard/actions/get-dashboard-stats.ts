"use server"

import { prisma } from "@/lib/db/prisma"

export interface DashboardStats {
  totalSites: number
  sitesByStatus: {
    pending: number
    crawling: number
    analyzed: number
    ready: number
  }
  totalKeywords: number
  approvedKeywords: number
  totalPosts: number
  postsByStatus: {
    draft: number
    review: number
    approved: number
    published: number
  }
  autopilotActive: number
  recentSites: {
    id: string
    slug: string
    name: string
    url: string
    onboardingStatus: string
    createdAt: Date
  }[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Batch 1: Site counts + recent sites
  const [
    totalSites,
    pendingSites,
    crawlingSites,
    analyzedSites,
    readySites,
    autopilotActive,
    recentSites,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { onboardingStatus: "pending" } }),
    prisma.site.count({ where: { onboardingStatus: "crawling" } }),
    prisma.site.count({ where: { onboardingStatus: "analyzed" } }),
    prisma.site.count({ where: { onboardingStatus: "ready" } }),
    prisma.site.count({ where: { autopilot: true } }),
    prisma.site.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        url: true,
        onboardingStatus: true,
        createdAt: true,
      },
    }),
  ])

  // Batch 2: Keyword + Post counts
  const [
    totalKeywords,
    approvedKeywords,
    totalPosts,
    draftPosts,
    reviewPosts,
    approvedPosts,
    publishedPosts,
  ] = await Promise.all([
    prisma.keyword.count(),
    prisma.keyword.count({ where: { status: "approved" } }),
    prisma.post.count(),
    prisma.post.count({ where: { status: "draft" } }),
    prisma.post.count({ where: { status: "review" } }),
    prisma.post.count({ where: { status: "approved" } }),
    prisma.post.count({ where: { status: "published" } }),
  ])

  return {
    totalSites,
    sitesByStatus: {
      pending: pendingSites,
      crawling: crawlingSites,
      analyzed: analyzedSites,
      ready: readySites,
    },
    totalKeywords,
    approvedKeywords,
    totalPosts,
    postsByStatus: {
      draft: draftPosts,
      review: reviewPosts,
      approved: approvedPosts,
      published: publishedPosts,
    },
    autopilotActive,
    recentSites,
  }
}
