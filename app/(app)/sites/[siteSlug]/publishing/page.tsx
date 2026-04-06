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
} from "lucide-react"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { getSiteBySlug } from "@/modules/sites/actions/get-sites"
import {
  testAndSyncConnection,
  updatePublishingSettings,
  resyncTaxonomy,
  getPublishingConfig,
} from "@/modules/publishing/actions/connect-site"

export default function PublishingSettingsPage() {
  const params = useParams()
  const siteSlug = params.siteSlug as string

  const [siteId, setSiteId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [resyncing, setResyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form state
  const [wpUsername, setWpUsername] = useState("")
  const [wpPassword, setWpPassword] = useState("")

  // Config state
  const [isConnected, setIsConnected] = useState(false)
  const [wpPublishAsDraft, setWpPublishAsDraft] = useState(false)
  const [autoPublishOnApproval, setAutoPublishOnApproval] = useState(false)
  const [taxonomy, setTaxonomy] = useState<{
    categories: { id: number; name: string }[]
    tags: { id: number; name: string }[]
    lastSyncedAt: string
  } | null>(null)
  const [connectedUser, setConnectedUser] = useState("")

  useEffect(() => {
    async function load() {
      const site = await getSiteBySlug(siteSlug)
      if (!site) return
      setSiteId(site.id)

      const config = await getPublishingConfig(site.id)
      if (config) {
        setWpUsername(config.wpUsername)
        setIsConnected(config.isConnected)
        setWpPublishAsDraft(config.wpPublishAsDraft)
        setAutoPublishOnApproval(config.autoPublishOnApproval)
        if (config.taxonomy) {
          setTaxonomy(config.taxonomy)
        }
      }
      setLoading(false)
    }
    load()
  }, [siteSlug])

  async function handleTestConnection() {
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
    setWpPassword("") // Clear password from form after saving encrypted

    // Refresh config to get taxonomy
    const config = await getPublishingConfig(siteId)
    if (config?.taxonomy) setTaxonomy(config.taxonomy)

    setTesting(false)
  }

  async function handleResync() {
    setResyncing(true)
    setError(null)

    const result = await resyncTaxonomy(siteId)
    if (!result.success) {
      setError(result.error ?? "Re-sync failed")
    } else {
      setSuccessMsg(`Re-synced ${result.categoryCount} categories and ${result.tagCount} tags.`)
      const config = await getPublishingConfig(siteId)
      if (config?.taxonomy) setTaxonomy(config.taxonomy)
    }

    setResyncing(false)
  }

  async function handleToggle(
    field: "wpPublishAsDraft" | "autoPublishOnApproval",
    value: boolean
  ) {
    setSaving(true)
    await updatePublishingSettings(siteId, { [field]: value })

    if (field === "wpPublishAsDraft") setWpPublishAsDraft(value)
    if (field === "autoPublishOnApproval") setAutoPublishOnApproval(value)

    setSaving(false)
  }

  if (loading) return <LoadingSpinner message="Loading publishing settings..." />

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Platform selector */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Publishing Platform
        </Label>
        <div className="flex gap-2 mt-2">
          <div className="px-4 py-2.5 rounded-lg border-2 border-primary bg-primary/10 text-primary text-sm font-semibold">
            WordPress
          </div>
          <div className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm opacity-50 cursor-not-allowed">
            Manus (Coming Soon)
          </div>
          <div className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm opacity-50 cursor-not-allowed">
            Custom API (Coming Soon)
          </div>
        </div>
      </div>

      {/* Connection card */}
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
              placeholder={isConnected ? "••••••••••••••••" : "xxxx xxxx xxxx xxxx xxxx xxxx"}
              value={wpPassword}
              onChange={(e) => setWpPassword(e.target.value)}
              disabled={testing}
            />
            <p className="text-xs text-muted-foreground">
              Found in WordPress → Users → Profile → Application Passwords
            </p>
          </div>

          <Button onClick={handleTestConnection} disabled={testing}>
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

      {/* Connection status */}
      {isConnected && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-500">Connected</p>
            <p className="text-xs text-muted-foreground">
              {taxonomy
                ? `${taxonomy.categories.length} categories · ${taxonomy.tags.length} tags · Last synced: ${new Date(taxonomy.lastSyncedAt).toLocaleDateString()}`
                : "Taxonomy synced"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResync}
            disabled={resyncing}
          >
            <RefreshCw className={`h-4 w-4 ${resyncing ? "animate-spin" : ""}`} />
            <span className="ml-1.5">Re-sync</span>
          </Button>
        </div>
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
                <p className="text-sm font-medium">Publish as draft in WordPress</p>
                <p className="text-xs text-muted-foreground">
                  Posts appear in WP admin but aren&apos;t public until you manually publish in WordPress
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={wpPublishAsDraft}
                disabled={saving}
                onClick={() => handleToggle("wpPublishAsDraft", !wpPublishAsDraft)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  wpPublishAsDraft ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    wpPublishAsDraft ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
