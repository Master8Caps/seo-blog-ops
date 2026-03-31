"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { getSiteById } from "@/modules/sites/actions/get-sites"
import { updateSite } from "@/modules/sites/actions/update-site"
import { deleteSite } from "@/modules/sites/actions/delete-site"
import { LoadingSpinner } from "@/components/shared/loading-spinner"

export default function EditSitePage() {
  const router = useRouter()
  const params = useParams()
  const siteId = params.siteId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [niche, setNiche] = useState("")
  const [audience, setAudience] = useState("")
  const [tone, setTone] = useState("")
  const [topics, setTopics] = useState("")

  useEffect(() => {
    async function load() {
      const site = await getSiteById(siteId)
      if (!site) {
        router.push("/sites")
        return
      }
      setName(site.name)
      setDescription(site.description ?? "")
      setNiche(site.niche ?? "")
      setAudience(site.audience ?? "")
      setTone(site.tone ?? "")
      setTopics(((site.topics as string[]) ?? []).join(", "))
      setLoading(false)
    }
    load()
  }, [siteId, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await updateSite({
        id: siteId,
        name,
        description: description || undefined,
        niche: niche || undefined,
        audience: audience || undefined,
        tone: tone || undefined,
        topics: topics
          ? topics.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        onboardingStatus: "ready",
      })
      router.push(`/sites/${siteId}`)
    } catch {
      setError("Failed to save changes")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this site? This will also delete all keywords and posts.")) {
      return
    }
    await deleteSite(siteId)
  }

  if (loading) {
    return <LoadingSpinner message="Loading site..." />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/sites/${siteId}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Site</h1>
      </div>

      <Card>
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Site Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Site Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>

          <CardHeader>
            <CardTitle>SEO Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="niche">Niche</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topics">Topics (comma-separated)</Label>
              <Input
                id="topics"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="SEO, Content Marketing, Link Building"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete Site
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
