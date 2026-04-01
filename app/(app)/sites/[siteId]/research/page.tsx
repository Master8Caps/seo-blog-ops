"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { KeywordTable } from "@/components/shared/keyword-table"
import {
  discoverFromSeeds,
  discoverFromSite,
  scoreTopKeywords,
} from "@/modules/research/actions/run-research"
import { getKeywordsForSiteId, getKeywordStats } from "@/modules/research/actions/get-keywords"
import { getSiteById } from "@/modules/sites/actions/get-sites"

export default function ResearchPage() {
  const params = useParams()
  const siteId = params.siteId as string

  const [siteName, setSiteName] = useState("")
  const [keywords, setKeywords] = useState<Awaited<ReturnType<typeof getKeywordsForSiteId>>>([])
  const [stats, setStats] = useState({ total: 0, approved: 0, discovered: 0 })
  const [loading, setLoading] = useState(true)
  const [researching, setResearching] = useState(false)
  const [researchStep, setResearchStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function refreshData() {
    const [site, kws, kwStats] = await Promise.all([
      getSiteById(siteId),
      getKeywordsForSiteId(siteId),
      getKeywordStats(siteId),
    ])
    if (site) setSiteName(site.name)
    setKeywords(kws)
    setStats(kwStats)
    setLoading(false)
  }

  useEffect(() => {
    async function loadData() {
      const [site, kws, kwStats] = await Promise.all([
        getSiteById(siteId),
        getKeywordsForSiteId(siteId),
        getKeywordStats(siteId),
      ])
      if (site) setSiteName(site.name)
      setKeywords(kws)
      setStats(kwStats)
      setLoading(false)
    }
    loadData()
  }, [siteId])

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

    // Report errors if both discovery steps failed
    if (!seedResult.success && !siteResult.success) {
      setError(seedResult.error ?? siteResult.error ?? "Research failed")
    } else {
      const scored = scoreResult.success ? scoreResult.keywordsFound : 0
      setSuccessMsg(`Found ${totalFound} keywords, scored top ${scored}`)
    }

    setResearchStep("")
    setResearching(false)
  }

  if (loading) {
    return <LoadingSpinner message="Loading keywords..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/sites/${siteId}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Keyword Research
          </h1>
          <p className="text-sm text-muted-foreground">{siteName}</p>
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
          <p className="mt-1 text-2xl font-bold">{stats.approved}</p>
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
