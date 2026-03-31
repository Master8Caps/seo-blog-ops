export interface SiteAnalysisInput {
  url: string
  description?: string
  pages: Array<{
    url: string
    title: string
    content: string
  }>
}

export interface SiteAnalysisResult {
  niche: string
  audience: string
  tone: string
  topics: string[]
  services: string[]
  keywords: string[]
  summary: string
}

export function buildSiteAnalysisPrompt(input: SiteAnalysisInput): string {
  const pageContent = input.pages
    .map(
      (page) =>
        `--- Page: ${page.url} ---\nTitle: ${page.title}\n${page.content}`
    )
    .join("\n\n")

  return `You are an SEO analyst. Analyze the following website content and produce a structured SEO profile.

Website URL: ${input.url}
${input.description ? `Business description: ${input.description}` : ""}

Crawled page content:
${pageContent}

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "niche": "The primary industry/niche this website operates in (e.g., 'Digital Marketing Agency', 'E-commerce Pet Supplies')",
  "audience": "The target audience (e.g., 'Small business owners looking for marketing help')",
  "tone": "The writing tone used on the site (e.g., 'Professional but approachable', 'Technical and authoritative')",
  "topics": ["Array of 5-10 core topic areas the site covers"],
  "services": ["Array of products/services offered, if identifiable"],
  "keywords": ["Array of 10-15 seed keywords relevant to this site's niche"],
  "summary": "A 2-3 sentence summary of what this website is about and what it's trying to achieve"
}`
}
