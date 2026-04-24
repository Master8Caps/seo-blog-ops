"use client"

import { useEffect, useState, useTransition } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { disconnectGoogle } from "@/modules/integrations/actions/disconnect-google"
import { runAutoMatch } from "@/modules/integrations/actions/auto-match-sites"
import { updateSiteGscProperty } from "@/modules/integrations/actions/update-site-gsc-property"

interface SiteRow {
  id: string
  slug: string
  name: string
  url: string
  gscProperty: string | null
  indexNowVerified: boolean
}

interface Props {
  connected: boolean
  connectedBy: string | null
  connectedAt: Date | null
  scopes: string | null
  sites: SiteRow[]
}

export function GoogleConnectionPanel({
  connected,
  connectedBy,
  connectedAt,
  scopes,
  sites,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [autoMatchSummary, setAutoMatchSummary] = useState<string | null>(null)

  const matched = sites.filter((s) => s.gscProperty)
  const unmatched = sites.filter((s) => !s.gscProperty)

  if (!connected) {
    return (
      <section className="rounded border p-6 space-y-4">
        <h2 className="text-lg font-medium">Connection</h2>
        <p className="text-sm text-muted-foreground">
          Not connected. Connect your Google account to enable auto-indexing and analytics sync.
        </p>
        <a href="/api/auth/google/start" className={buttonVariants()}>
          Connect Google Account
        </a>
      </section>
    )
  }

  return (
    <section className="rounded border p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Connection</h2>
          <p className="text-sm text-muted-foreground">
            ✓ Connected as {connectedBy ?? "unknown"} on{" "}
            {connectedAt ? new Date(connectedAt).toLocaleDateString() : "—"}
          </p>
          {scopes && (
            <p className="text-xs text-muted-foreground mt-1">
              Scopes: {scopes.split(" ").length} granted
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await runAutoMatch()
                if (r.success && r.data) {
                  setAutoMatchSummary(
                    `${r.data.matched.length} matched · ${r.data.ambiguous.length} ambiguous · ${r.data.unmatched.length} unmatched`
                  )
                } else {
                  setAutoMatchSummary(`Error: ${r.error}`)
                }
              })
            }}
          >
            Refresh auto-match
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!confirm("Disconnect Google? Sync and indexing will stop until you reconnect.")) return
              startTransition(async () => {
                await disconnectGoogle()
              })
            }}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {autoMatchSummary && (
        <p className="text-sm text-muted-foreground">{autoMatchSummary}</p>
      )}

      <div>
        <h3 className="text-sm font-medium mb-2">Site → GSC property links</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Site</th>
              <th className="py-2">GSC property</th>
              <th className="py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <SiteLinkRow key={site.id} site={site} />
            ))}
          </tbody>
        </table>
        {unmatched.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {unmatched.length} site(s) not yet linked. Click &quot;Refresh auto-match&quot; or paste a property manually.
          </p>
        )}
        {matched.length > 0 && unmatched.length === 0 && (
          <p className="text-xs text-green-700 mt-2">All sites linked.</p>
        )}
      </div>
    </section>
  )
}

function SiteLinkRow({ site }: { site: SiteRow }) {
  const [value, setValue] = useState(site.gscProperty ?? "")
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Sync local input state when the server prop changes (e.g. after auto-match
  // writes a new gscProperty). Without this, useState keeps its initial value
  // forever and the input looks empty even though the DB has been updated.
  useEffect(() => {
    setValue(site.gscProperty ?? "")
    setSaved(false)
  }, [site.gscProperty])

  return (
    <tr className="border-t">
      <td className="py-2">
        <div className="font-medium">{site.name}</div>
        <div className="text-xs text-muted-foreground">{site.url}</div>
      </td>
      <td className="py-2">
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder="sc-domain:example.com or https://example.com/"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
        />
      </td>
      <td className="py-2 text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending || value === (site.gscProperty ?? "")}
          onClick={() => {
            startTransition(async () => {
              const r = await updateSiteGscProperty(site.id, value || null)
              if (r.success) setSaved(true)
            })
          }}
        >
          {saved ? "✓" : "Save"}
        </Button>
      </td>
    </tr>
  )
}
