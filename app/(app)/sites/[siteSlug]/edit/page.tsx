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
import { Save, RefreshCw, Loader2 } from "lucide-react"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"
import { updateSite, reextractLogo } from "@/modules/sites/actions/update-site"
import { deleteSite } from "@/modules/sites/actions/delete-site"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { SiteFavicon } from "@/components/shared/site-favicon"

export default function EditSitePage() {
  const router = useRouter()
  const params = useParams()
  const siteSlug = params.siteSlug as string

  const [siteId, setSiteId] = useState("")
  const [siteUrl, setSiteUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reextracting, setReextracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoMsg, setLogoMsg] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [niche, setNiche] = useState("")
  const [audience, setAudience] = useState("")
  const [tone, setTone] = useState("")
  const [topics, setTopics] = useState("")

  useEffect(() => {
    async function load() {
      const site = await getSiteBySlug(siteSlug)
      if (!site) {
        router.push("/sites")
        return
      }
      setSiteId(site.id)
      setSiteUrl(site.url)
      setName(site.name)
      setDescription(site.description ?? "")
      setLogoUrl(site.logoUrl ?? "")
      setNiche(site.niche ?? "")
      setAudience(site.audience ?? "")
      setTone(site.tone ?? "")
      setTopics(((site.topics as string[]) ?? []).join(", "))
      setLoading(false)
    }
    load()
  }, [siteSlug, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await updateSite({
        id: siteId,
        name,
        description: description || undefined,
        logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
        niche: niche || undefined,
        audience: audience || undefined,
        tone: tone || undefined,
        topics: topics
          ? topics.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        onboardingStatus: "ready",
      })
      router.push(`/sites/${siteSlug}`)
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

  async function handleReextractLogo() {
    setReextracting(true)
    setLogoMsg(null)
    const result = await reextractLogo(siteId)
    if (result.success && result.logoUrl) {
      setLogoUrl(result.logoUrl)
      setLogoMsg("Logo re-detected from site.")
    } else {
      setLogoMsg(result.error ?? "Could not detect a logo.")
    }
    setReextracting(false)
  }

  if (loading) {
    return <LoadingSpinner message="Loading site..." />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">

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

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/30 shrink-0">
                  <SiteFavicon
                    url={siteUrl}
                    logoUrl={logoUrl || null}
                    size={40}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Input
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.svg"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReextractLogo}
                      disabled={reextracting}
                    >
                      {reextracting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5">Re-detect from site</span>
                    </Button>
                    {logoMsg && (
                      <span className="text-xs text-muted-foreground">{logoMsg}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-detected during onboarding. Paste a direct URL to override, or leave
                blank to fall back to the site&apos;s favicon.
              </p>
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
