"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Loader2,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"
import {
  testAndSyncConnection,
  testAndSyncApiConnection,
  updatePublishingSettings,
  resyncTaxonomy,
  resyncApiMetadata,
  getPublishingConfig,
  disconnectPublishing,
} from "@/modules/publishing/actions/connect-site"
import { resyncExternalPosts } from "@/modules/publishing/actions/resync-posts"
import { getExternalPostCount } from "@/modules/publishing/actions/get-external-post-count"

type Platform = "api" | "wordpress" | null

export default function PublishingSettingsPage() {
  const params = useParams()
  const siteSlug = params.siteSlug as string

  const [siteId, setSiteId] = useState("")
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [resyncing, setResyncing] = useState(false)
  const [resyncingPosts, setResyncingPosts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [postsWarning, setPostsWarning] = useState<string | null>(null)
  const [externalPostCount, setExternalPostCount] = useState(0)

  // Platform selection
  const [platform, setPlatform] = useState<Platform>(null)

  // Standard API form state
  const [apiKey, setApiKey] = useState("")

  // WordPress form state
  const [wpUsername, setWpUsername] = useState("")
  const [wpPassword, setWpPassword] = useState("")

  // Config state
  const [isConnected, setIsConnected] = useState(false)
  const [publishAsDraft, setPublishAsDraft] = useState(false)
  const [autoPublishOnApproval, setAutoPublishOnApproval] = useState(false)
  const [taxonomy, setTaxonomy] = useState<{
    categories: { slug: string; name: string }[]
    tags: string[] | { slug: string; name: string }[]
    context?: { label: string; description: string; items: { slug: string; name: string }[] }[]
    lastSyncedAt: string
  } | null>(null)
  const [connectedUser, setConnectedUser] = useState("")
  const [contextExpanded, setContextExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const site = await getSiteBySlug(siteSlug)
      if (!site) return
      setSiteId(site.id)

      const config = await getPublishingConfig(site.id)
      if (config) {
        setPlatform((config.publishType as Platform) ?? null)
        setWpUsername(config.wpUsername)
        setIsConnected(config.isWpConnected || config.isApiConnected)
        setPublishAsDraft(
          config.publishType === "wordpress"
            ? config.wpPublishAsDraft
            : config.publishAsDraft
        )
        setAutoPublishOnApproval(config.autoPublishOnApproval)
        if (config.taxonomy) setTaxonomy(config.taxonomy)
      }

      const count = await getExternalPostCount(site.id)
      setExternalPostCount(count)

      setLoading(false)
    }
    load()
  }, [siteSlug])

  async function handleTestApiConnection() {
    if (!apiKey) {
      setError("API key is required")
      return
    }
    setTesting(true)
    setError(null)
    setSuccessMsg(null)

    const result = await testAndSyncApiConnection(siteId, apiKey)

    if (!result.success) {
      setError(result.error ?? "Connection failed")
      setTesting(false)
      return
    }

    setIsConnected(true)
    setSuccessMsg(
      `Connected! Synced ${result.categoryCount} categories, ${result.tagCount} tags, and ${result.contextGroupCount} context groups.`
    )
    setPostsWarning(result.postsWarning ?? null)
    setApiKey("")

    const config = await getPublishingConfig(siteId)
    if (config?.taxonomy) setTaxonomy(config.taxonomy)

    const count = await getExternalPostCount(siteId)
    setExternalPostCount(count)

    setTesting(false)
  }

  async function handleTestWpConnection() {
    if (!wpUsername || !wpPassword) {
      setError("Username and application password are required")
      return
    }
    setTesting(true)
    setError(null)
    setSuccessMsg(null)

    const result = await testAndSyncConnection(siteId, wpUsername, wpPassword)

    if (!result.success) {
      setError(result.error ?? "Connection failed")
      setTesting(false)
      return
    }

    setIsConnected(true)
    setConnectedUser(result.userName ?? wpUsername)
    setSuccessMsg(
      `Connected successfully! Synced ${result.categoryCount} categories and ${result.tagCount} tags.`
    )
    setPostsWarning(result.postsWarning ?? null)
    setWpPassword("")

    const config = await getPublishingConfig(siteId)
    if (config?.taxonomy) setTaxonomy(config.taxonomy)

    const count = await getExternalPostCount(siteId)
    setExternalPostCount(count)

    setTesting(false)
  }

  async function handleResync() {
    setResyncing(true)
    setError(null)

    const result = platform === "wordpress"
      ? await resyncTaxonomy(siteId)
      : await resyncApiMetadata(siteId)

    if (!result.success) {
      setError(result.error ?? "Re-sync failed")
    } else {
      const contextCount = "contextGroupCount" in result ? `, ${result.contextGroupCount} context groups` : ""
      setSuccessMsg(`Re-synced ${result.categoryCount} categories and ${result.tagCount} tags${contextCount}.`)
      const config = await getPublishingConfig(siteId)
      if (config?.taxonomy) setTaxonomy(config.taxonomy)
    }

    setResyncing(false)
  }

  async function handleResyncPosts() {
    setResyncingPosts(true)
    setError(null)
    setPostsWarning(null)

    const result = await resyncExternalPosts(siteId)

    if (!result.ok) {
      setPostsWarning(result.error ?? "Posts re-sync failed")
    } else {
      setSuccessMsg(`Re-synced ${result.count} cached posts.`)
      const count = await getExternalPostCount(siteId)
      setExternalPostCount(count)
    }

    setResyncingPosts(false)
  }

  async function handleToggle(
    field: "publishAsDraft" | "wpPublishAsDraft" | "autoPublishOnApproval",
    value: boolean
  ) {
    setSaving(true)
    await updatePublishingSettings(siteId, { [field]: value })

    if (field === "publishAsDraft" || field === "wpPublishAsDraft") setPublishAsDraft(value)
    if (field === "autoPublishOnApproval") setAutoPublishOnApproval(value)

    setSaving(false)
  }

  async function handleSwitchPlatform(newPlatform: Platform) {
    if (isConnected && newPlatform !== platform) {
      // Disconnect existing before switching
      await disconnectPublishing(siteId)
      setIsConnected(false)
      setTaxonomy(null)
      setSuccessMsg(null)
      setError(null)
    }
    setPlatform(newPlatform)
  }

  const draftToggleField = platform === "wordpress" ? "wpPublishAsDraft" : "publishAsDraft"
  const tagCount = taxonomy
    ? Array.isArray(taxonomy.tags)
      ? taxonomy.tags.length
      : 0
    : 0

  if (loading) return <LoadingSpinner message="Loading publishing settings..." />

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Platform selector */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Publishing Platform
        </Label>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => handleSwitchPlatform("api")}
            className={`px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
              platform === "api"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            Standard API
          </button>
          <button
            type="button"
            onClick={() => handleSwitchPlatform("wordpress")}
            className={`px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
              platform === "wordpress"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            WordPress
          </button>
        </div>
        {platform === "api" && (
          <p className="text-xs text-muted-foreground mt-2">
            For Manus sites, Claude-built Vercel sites, or any site with the standard publish API.
          </p>
        )}
      </div>

      {/* Standard API connection card */}
      {platform === "api" && !isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>API Connection</CardTitle>
            <CardDescription>
              Enter the API key for this site. Each site has a unique key configured
              in its environment secrets as <code className="text-xs">BLOG_PUBLISH_API_KEY</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={testing}
              />
              <p className="text-xs text-muted-foreground">
                The UUID configured in the site&apos;s secrets
              </p>
            </div>

            <Button onClick={handleTestApiConnection} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection & Sync Metadata"
              )}
            </Button>

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
          </CardContent>
        </Card>
      )}

      {/* WordPress connection card */}
      {platform === "wordpress" && !isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>WordPress Connection</CardTitle>
            <CardDescription>
              We recommend creating a dedicated WordPress user (e.g. &quot;SEO Blog Ops&quot;)
              with the <strong>Editor</strong> role, then generating an Application Password
              under that user&apos;s profile. Found in WordPress → Users → Profile → Application Passwords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wp-username">WordPress Username</Label>
              <Input
                id="wp-username"
                placeholder="e.g. seo-blog-ops"
                value={wpUsername}
                onChange={(e) => setWpUsername(e.target.value)}
                disabled={testing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-password">Application Password</Label>
              <Input
                id="wp-password"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={wpPassword}
                onChange={(e) => setWpPassword(e.target.value)}
                disabled={testing}
              />
              <p className="text-xs text-muted-foreground">
                Found in WordPress → Users → Profile → Application Passwords
              </p>
            </div>

            <Button onClick={handleTestWpConnection} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection & Sync Taxonomy"
              )}
            </Button>

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
          </CardContent>
        </Card>
      )}

      {/* Connection status */}
      {isConnected && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-500">
                Connected{connectedUser ? ` as ${connectedUser}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {taxonomy ? (
                  <>
                    <span>{taxonomy.categories.length} categories</span>
                    <span> · </span>
                    <span>{tagCount} tags</span>
                    {taxonomy.context?.length ? (
                      <>
                        <span> · </span>
                        <span>{taxonomy.context.length} context groups</span>
                      </>
                    ) : null}
                    <span> · </span>
                    <span>Cached posts: {externalPostCount}</span>
                    <span> · </span>
                    <span>Last synced: {new Date(taxonomy.lastSyncedAt).toLocaleDateString()}</span>
                  </>
                ) : (
                  <>Cached posts: {externalPostCount}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResync}
                disabled={resyncing || resyncingPosts}
              >
                <RefreshCw className={`h-4 w-4 ${resyncing ? "animate-spin" : ""}`} />
                <span className="ml-1.5">Re-sync metadata</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResyncPosts}
                disabled={resyncing || resyncingPosts}
              >
                <RefreshCw className={`h-4 w-4 ${resyncingPosts ? "animate-spin" : ""}`} />
                <span className="ml-1.5">Re-sync posts from site</span>
              </Button>
            </div>
          </div>
          {postsWarning && (
            <div className="text-amber-500 text-sm bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
              Posts sync warning: {postsWarning}
            </div>
          )}
        </div>
      )}

      {/* Site context preview (Standard API only) */}
      {isConnected && platform === "api" && taxonomy?.context && taxonomy.context.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <button
              type="button"
              onClick={() => setContextExpanded(!contextExpanded)}
              className="flex items-center gap-2 w-full text-left"
            >
              {contextExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-base">Site Context</CardTitle>
              <span className="text-xs text-muted-foreground ml-auto">
                {taxonomy.context.length} group{taxonomy.context.length !== 1 ? "s" : ""}
              </span>
            </button>
            <CardDescription className="ml-6">
              Context data from this site, used by AI to generate more targeted content.
            </CardDescription>
          </CardHeader>
          {contextExpanded && (
            <CardContent className="space-y-4 pt-0">
              {taxonomy.context.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {group.items.map((item) => (
                      <span
                        key={item.slug}
                        className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Publishing options */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Publishing Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-publish on approval</p>
                <p className="text-xs text-muted-foreground">
                  Automatically publish posts when they are approved
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoPublishOnApproval}
                disabled={saving}
                onClick={() => handleToggle("autoPublishOnApproval", !autoPublishOnApproval)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  autoPublishOnApproval ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    autoPublishOnApproval ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Publish as draft</p>
                <p className="text-xs text-muted-foreground">
                  {platform === "wordpress"
                    ? "Posts appear in WP admin but aren't public until you manually publish in WordPress"
                    : "Articles are created with published=false so they aren't live immediately"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publishAsDraft}
                disabled={saving}
                onClick={() => handleToggle(draftToggleField, !publishAsDraft)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  publishAsDraft ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    publishAsDraft ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No platform selected */}
      {!platform && (
        <p className="text-sm text-muted-foreground">
          Select a publishing platform above to configure how posts are published to this site.
        </p>
      )}
    </div>
  )
}
