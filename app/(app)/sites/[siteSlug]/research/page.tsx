"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { KeywordTable } from "@/components/shared/keyword-table"
import {
  discoverFromSeeds,
  discoverFromSite,
  scoreTopKeywords,
  selectKeywords,
} from "@/modules/research/actions/run-research"
import { getKeywordsForSiteId, getKeywordStats, clearKeywords } from "@/modules/research/actions/get-keywords"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"

export default function ResearchPage() {
  const params = useParams()
  const siteSlug = params.siteSlug as string

  const [siteId, setSiteId] = useState("")
  const [keywords, setKeywords] = useState<Awaited<ReturnType<typeof getKeywordsForSiteId>>>([])
  const [stats, setStats] = useState({ total: 0, approved: 0, discovered: 0, aiApproved: 0 })
  const [loading, setLoading] = useState(true)
  const [researching, setResearching] = useState(false)
  const [researchStep, setResearchStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function refreshData(id?: string) {
    const resolvedId = id ?? siteId
    if (!resolvedId) return
    const [kws, kwStats] = await Promise.all([
      getKeywordsForSiteId(resolvedId),
      getKeywordStats(resolvedId),
    ])
    setKeywords(kws)
    setStats(kwStats)
    setLoading(false)
  }

  useEffect(() => {
    async function loadData() {
      const site = await getSiteBySlug(siteSlug)
      if (!site) return
      setSiteId(site.id)
      const [kws, kwStats] = await Promise.all([
        getKeywordsForSiteId(site.id),
        getKeywordStats(site.id),
      ])
      setKeywords(kws)
      setStats(kwStats)
      setLoading(false)
    }
    loadData()
  }, [siteSlug])

  async function handleRunResearch() {
    setResearching(true)
    setError(null)
    setSuccessMsg(null)
    let totalFound = 0

    // Step 1: Discover from seed keywords
    setResearchStep("Discovering from seed keywords...")
    const seedResult = await discoverFromSeeds(siteId)
    if (seedResult.success) {
      totalFound += seedResult.keywordsFound
      await refreshData()
    }

    // Step 2: Discover from site URL
    setResearchStep("Discovering from site URL...")
    const siteResult = await discoverFromSite(siteId)
    if (siteResult.success) {
      totalFound += siteResult.keywordsFound
      await refreshData()
    }

    // Step 3: AI scoring on top keywords
    setResearchStep("Scoring top keywords with AI...")
    const scoreResult = await scoreTopKeywords(siteId)
    if (scoreResult.success) {
      await refreshData()
    }

    // Step 4: AI select best keywords
    setResearchStep("Selecting best keywords...")
    const selectResult = await selectKeywords(siteId)
    if (selectResult.success) {
      await refreshData()
    }

    // Report errors if both discovery steps failed
    if (!seedResult.success && !siteResult.success) {
      setError(seedResult.error ?? siteResult.error ?? "Research failed")
    } else {
      const scored = scoreResult.success ? scoreResult.keywordsFound : 0
      const selected = selectResult.success ? selectResult.keywordsFound : 0
      setSuccessMsg(`Found ${totalFound} keywords, scored ${scored}, selected ${selected}`)
    }

    setResearchStep("")
    setResearching(false)
  }

  if (loading) {
    return <LoadingSpinner message="Loading keywords..." />
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          {keywords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm("Delete all keywords and start fresh?")) return
                await clearKeywords(siteId)
                await refreshData()
              }}
              disabled={researching}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
        </div>
        <Button
          onClick={handleRunResearch}
          disabled={researching}
        >
          {researching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {researchStep || "Researching..."}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Research
            </>
          )}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-md bg-primary/15 p-3 text-sm text-primary">
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Keywords</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Discovered</p>
          <p className="mt-1 text-2xl font-bold">{stats.discovered}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="mt-1 text-2xl font-bold">
            {stats.approved}
            {stats.aiApproved > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-400">
                ({stats.aiApproved} AI)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Keywords Table */}
      {keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Search className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No keywords yet</p>
          <p className="text-sm text-muted-foreground">
            Click &quot;Run Research&quot; to discover keyword opportunities.
          </p>
        </div>
      ) : (
        <KeywordTable keywords={keywords} />
      )}
    </div>
  )
}
