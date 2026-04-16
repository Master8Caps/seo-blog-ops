"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { getPosts } from "@/modules/content/actions/get-posts"
import {
  queuePostGeneration,
  getJobStatus,
} from "@/modules/content/actions/queue-generation"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  approved: { label: "Approved", className: "border-green-500/50 bg-green-500/10 text-green-400" },
  published: { label: "Published", className: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  rejected: { label: "Rejected", className: "border-red-500/50 bg-red-500/10 text-red-400" },
}

export default function SiteContentPage() {
  const params = useParams()
  const siteSlug = params.siteSlug as string

  const [siteId, setSiteId] = useState("")
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof getPosts>>>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const refreshPosts = useCallback(async (id?: string) => {
    const resolvedId = id ?? siteId
    if (!resolvedId) return
    const updated = await getPosts({ siteId: resolvedId })
    setPosts(updated)
  }, [siteId])

  useEffect(() => {
    async function loadData() {
      try {
        const site = await getSiteBySlug(siteSlug)
        if (!site) {
          setError(`Site not found: ${siteSlug}`)
          setLoading(false)
          return
        }
        setSiteId(site.id)
        const sitePosts = await getPosts({ siteId: site.id })
        setPosts(sitePosts)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load content")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [siteSlug])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setSuccessMsg(null)

    const result = await queuePostGeneration(siteId)

    if (!result.success || !result.jobId) {
      setError(result.error ?? "Failed to queue generation")
      setGenerating(false)
      return
    }

    // Poll for job completion + progress
    const jobId = result.jobId
    setGenerationStep("Queued, waiting to start...")
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
        setSuccessMsg("Post generated successfully! AI selected the best keywords.")
        await refreshPosts()
        setGenerating(false)
        setGenerationStep(null)
      } else if (job.status === "failed") {
        clearInterval(poll)
        setError(job.error ?? "Generation failed")
        setGenerating(false)
        setGenerationStep(null)
      }
    }, 3000)
  }

  if (loading) {
    return <LoadingSpinner message="Loading content..." />
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          {generating && generationStep && (
            <span className="text-sm text-muted-foreground animate-pulse">
              {generationStep}
            </span>
          )}
          <Button onClick={handleGenerate} disabled={generating}>
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
        </div>
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

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No posts yet</p>
          <p className="text-sm text-muted-foreground">
            Click &quot;Generate Post&quot; — AI will pick the best keywords automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium">Keyword</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const status = statusConfig[post.status] ?? statusConfig.draft
                return (
                  <tr key={post.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <Link
                        href={`/content/${post.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {post.keyword?.keyword ?? "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
