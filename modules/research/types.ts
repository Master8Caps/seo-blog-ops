export type KeywordStatus = "discovered" | "approved" | "used" | "rejected"

export interface KeywordWithMetrics {
  id: string
  keyword: string
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  competition: string | null
  intent: string | null
  relevanceScore: number | null
  cluster: string | null
  status: KeywordStatus
  createdAt: Date
}

export interface ResearchResult {
  success: boolean
  keywordsFound: number
  error?: string
}
