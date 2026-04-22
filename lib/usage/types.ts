export type Provider = "anthropic" | "gemini" | "stealthgpt" | "dataforseo" | "jina"

export type Operation =
  | "generate-content"
  | "humanize"
  | "image-gen"
  | "classify-taxonomy"
  | "score-keywords"
  | "select-keywords"
  | "site-analysis"
  | "crawl"
  | "kw-for-site"
  | "kw-for-keywords"
  | "generate-angles"
  | "select-angle"

export interface Attribution {
  siteId?: string
  postId?: string
  researchRunId?: string
  jobId?: string
}

export interface UsageUnits {
  inputTokens?: number
  outputTokens?: number
  wordCount?: number
  imageCount?: number
  apiCallCount?: number
}
