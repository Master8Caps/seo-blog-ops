"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Sparkles } from "lucide-react"
import { getSitesForGeneration } from "@/modules/sites/actions/get-sites"
import {
  queuePostGeneration,
  getJobStatus,
} from "@/modules/content/actions/queue-generation"

type SiteOption = Awaited<ReturnType<typeof getSitesForGeneration>>[number]

export function GenerateContentButton() {
  const router = useRouter()
  const [sites, setSites] = useState<SiteOption[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    getSitesForGeneration().then(setSites)
  }, [])

  async function handleGenerate() {
    if (!selectedSiteId) return
    setGenerating(true)
    setError(null)
    setSuccessMsg(null)

    const result = await queuePostGeneration(selectedSiteId)

    if (!result.success || !result.jobId) {
      setError(result.error ?? "Failed to queue generation")
      setGenerating(false)
      return
    }

    setGenerationStep("Queued, waiting to start...")
    const jobId = result.jobId
    const poll = setInterval(async () => {
      const job = await getJobStatus(jobId)
      if (!job) {
        clearInterval(poll)
        setError("Job not found")
        setGenerating(false)
        setGenerationStep(null)
        return
      }

      if (job.step) {
        setGenerationStep(job.step)
      }

      if (job.status === "completed") {
        clearInterval(poll)
        const siteName = sites.find((s) => s.id === selectedSiteId)?.name ?? "site"
        setSuccessMsg(`Post generated for ${siteName}!`)
        setGenerating(false)
        setGenerationStep(null)
        router.refresh()
      } else if (job.status === "failed") {
        clearInterval(poll)
        setError(job.error ?? "Generation failed")
        setGenerating(false)
        setGenerationStep(null)
      }
    }, 3000)
  }

  const eligibleSites = sites.filter((s) => s._count.keywords > 0)
  const selectedSite = sites.find((s) => s.id === selectedSiteId)

  return (
    <div className="flex flex-col items-end gap-2">
      <Select
        value={selectedSiteId}
        onValueChange={(val) => setSelectedSiteId(val ?? "")}
        disabled={generating}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select a site...">
            {selectedSite
              ? `${selectedSite.name} (${selectedSite._count.keywords} keywords)`
              : "Select a site..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {eligibleSites.length === 0 ? (
            <SelectItem value="_none" disabled>
              No sites with approved keywords
            </SelectItem>
          ) : (
            eligibleSites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name} ({site._count.keywords} keywords)
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button
        onClick={handleGenerate}
        disabled={generating || !selectedSiteId}
        className="w-[220px]"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Post
          </>
        )}
      </Button>
      {generating && generationStep && (
        <span className="text-sm text-muted-foreground animate-pulse">
          {generationStep}
        </span>
      )}

      {error && (
        <div className="w-[220px] rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="w-[220px] rounded-md bg-primary/15 p-3 text-sm text-primary">
          {successMsg}
        </div>
      )}
    </div>
  )
}
