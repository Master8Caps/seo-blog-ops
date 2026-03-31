export interface SiteProfile {
  niche: string
  audience: string
  tone: string
  topics: string[]
  services: string[]
  keywords: string[]
  summary: string
}

export type OnboardingStatus = "pending" | "crawling" | "analyzed" | "ready"

export interface CrawledPage {
  url: string
  title: string
  content: string
}

export interface CrawlResult {
  pages: CrawledPage[]
  errors: string[]
}
