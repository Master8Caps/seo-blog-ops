"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { getPosts } from "@/modules/content/actions/get-posts"
import { generatePost } from "@/modules/content/actions/generate-post"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"
import { getKeywordsForSiteId } from "@/modules/research/actions/get-keywords"

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
  const [approvedKeywords, setApprovedKeywords] = useState<
    Array<{ id: string; keyword: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const site = await getSiteBySlug(siteSlug)
      if (!site) return
      setSiteId(site.id)
      const [sitePosts, keywords] = await Promise.all([
        getPosts({ siteId: site.id }),
        getKeywordsForSiteId(site.id, "approved"),
      ])
      setPosts(sitePosts)
      setApprovedKeywords(
        keywords.map((k) => ({ id: k.id, keyword: k.keyword }))
      )
      setLoading(false)
    }
    loadData()
  }, [siteSlug])

  async function handleGenerate(keywordId: string) {
    setGenerating(true)
    setError(null)
    setSuccessMsg(null)
    setGeneratingStep("Generating blog post...")

    const result = await generatePost(siteId, keywordId)

    if (result.success) {
      setSuccessMsg("Post generated successfully!")
      const updated = await getPosts({ siteId })
      setPosts(updated)
      const keywords = await getKeywordsForSiteId(siteId, "approved")
      setApprovedKeywords(keywords.map((k) => ({ id: k.id, keyword: k.keyword })))
    } else {
      setError(result.error ?? "Generation failed")
    }

    setGenerating(false)
    setGeneratingStep("")
  }

  if (loading) {
    return <LoadingSpinner message="Loading content..." />
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div />
        {approvedKeywords.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {generatingStep}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Post
                    </>
                  )}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              {approvedKeywords.map((kw) => (
                <DropdownMenuItem
                  key={kw.id}
                  onClick={() => handleGenerate(kw.id)}
                >
                  {kw.keyword}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button disabled>
            <Sparkles className="mr-2 h-4 w-4" />
            No approved keywords
          </Button>
        )}
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
            Generate a post from an approved keyword.
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
