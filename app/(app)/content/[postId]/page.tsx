"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Check,
  X,
  Save,
  Loader2,
  Trash2,
  Send,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { getPostById } from "@/modules/content/actions/get-posts"
import {
  updatePostContent,
  approvePost,
  rejectPost,
  deletePost,
} from "@/modules/content/actions/update-post"
import {
  queuePostPublish,
  getJobStatus,
} from "@/modules/content/actions/queue-generation"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  approved: { label: "Approved", className: "border-green-500/50 bg-green-500/10 text-green-400" },
  published: { label: "Published", className: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  rejected: { label: "Rejected", className: "border-red-500/50 bg-red-500/10 text-red-400" },
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.postId as string

  const [post, setPost] = useState<Awaited<ReturnType<typeof getPostById>>>(null)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [rejectNotes, setRejectNotes] = useState("")
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishStep, setPublishStep] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await getPostById(postId)
      if (!data) {
        router.push("/content")
        return
      }
      setPost(data)
      setContent(data.content)
      setLoading(false)
    }
    load()
  }, [postId, router])

  async function handleSave() {
    setSaving(true)
    await updatePostContent(postId, content)
    setDirty(false)
    setSaving(false)
  }

  async function handleApprove() {
    if (dirty) await handleSave()
    await approvePost(postId, "user")
    const updated = await getPostById(postId)
    setPost(updated)
  }

  async function handleReject() {
    if (!rejectNotes.trim()) return
    await rejectPost(postId, rejectNotes)
    const updated = await getPostById(postId)
    setPost(updated)
    setShowRejectInput(false)
    setRejectNotes("")
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishError(null)

    const result = await queuePostPublish(postId)
    if (!result.success || !result.jobId) {
      setPublishError(result.error ?? "Failed to queue publishing")
      setPublishing(false)
      return
    }

    setPublishStep("Queued, waiting to start...")
    const jobId = result.jobId
    const poll = setInterval(async () => {
      const job = await getJobStatus(jobId)
      if (!job) {
        clearInterval(poll)
        setPublishError("Job not found")
        setPublishing(false)
        setPublishStep(null)
        return
      }

      if (job.step) setPublishStep(job.step)

      if (job.status === "completed") {
        clearInterval(poll)
        setPublishing(false)
        setPublishStep(null)
        const updated = await getPostById(postId)
        setPost(updated)
      } else if (job.status === "failed") {
        clearInterval(poll)
        setPublishError(job.error ?? "Publishing failed")
        setPublishing(false)
        setPublishStep(null)
      }
    }, 3000)
  }

  if (loading || !post) {
    return <LoadingSpinner message="Loading post..." />
  }

  const status = statusConfig[post.status] ?? statusConfig.draft

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/content"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">
            {post.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {post.site.name} · {post.keyword?.keyword ?? "No keyword"}
          </p>
        </div>
        <Badge variant="outline" className={`text-xs ${status.className}`}>
          {status.label}
        </Badge>
      </div>

      {/* Meta info */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Meta: {post.metaTitle}</span>
        <span>Slug: /{post.slug}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          Save
        </Button>
        {post.status === "draft" && (
          <>
            <Button size="sm" onClick={handleApprove}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectInput(!showRejectInput)}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        {post.status === "approved" && (
          <>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Publish to WordPress
                </>
              )}
            </Button>
            {publishing && publishStep && (
              <span className="text-sm text-muted-foreground animate-pulse">
                {publishStep}
              </span>
            )}
          </>
        )}
        <div className="ml-auto">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              if (!confirm("Delete this post? This cannot be undone.")) return
              await deletePost(postId)
              router.push("/content")
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Publish error */}
      {publishError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {publishError}
        </div>
      )}

      {/* Published details */}
      {post.status === "published" && post.publishedUrl && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-purple-400">
            Published Details
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">URL:</span>
            <a
              href={post.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              {post.publishedUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {post.publishedAt && (
            <div className="text-sm">
              <span className="text-muted-foreground">Published:</span>{" "}
              {new Date(post.publishedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Reject notes input */}
      {showRejectInput && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Reason for rejection..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <Button size="sm" variant="destructive" onClick={handleReject}>
            Confirm Reject
          </Button>
        </div>
      )}

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Markdown Editor */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Markdown
          </p>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setDirty(true)
            }}
            className="w-full h-[70vh] rounded-lg border border-border bg-card p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview
          </p>
          <div
            className="h-[70vh] overflow-y-auto rounded-lg border border-border bg-card p-4 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          />
        </div>
      </div>
    </div>
  )
}

/** Simple markdown to HTML converter for preview */
function markdownToHtml(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-4 max-w-full" />')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, "<br>")
    .replace(/^/, '<p class="mb-3">')
    .replace(/$/, "</p>")
}
