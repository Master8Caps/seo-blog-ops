"use client"

import { useState, useTransition } from "react"
import { buttonVariants } from "@/components/ui/button"
import { setIndexNowVerified } from "@/modules/integrations/actions/set-indexnow-verified"

interface SiteRow {
  id: string
  name: string
  url: string
  indexNowVerified: boolean
}

interface Props {
  sites: SiteRow[]
  indexNowKey: string
}

export function IndexNowPanel({ sites, indexNowKey }: Props) {
  const downloadHref = indexNowKey
    ? `data:text/plain;charset=utf-8,${encodeURIComponent(indexNowKey)}`
    : undefined

  return (
    <section className="rounded border p-6 space-y-4">
      <h2 className="text-lg font-medium">IndexNow</h2>
      {!indexNowKey && (
        <p className="text-sm text-amber-700">
          INDEXNOW_KEY env var is not set — IndexNow pings are disabled.
        </p>
      )}
      {indexNowKey && (
        <>
          <p className="text-sm text-muted-foreground">
            Your IndexNow key: <code className="bg-muted px-1 py-0.5 rounded">{indexNowKey}</code>.
            Upload <strong><code>{indexNowKey}.txt</code></strong> to the root of each site so IndexNow
            can verify pings come from you.
          </p>
          <a
            href={downloadHref}
            download={`${indexNowKey}.txt`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Download verification file
          </a>
          <table className="w-full text-sm mt-4">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Site</th>
                <th className="py-2">Verified</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <IndexNowRow key={site.id} site={site} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}

function IndexNowRow({ site }: { site: SiteRow }) {
  const [verified, setVerified] = useState(site.indexNowVerified)
  const [pending, startTransition] = useTransition()

  return (
    <tr className="border-t">
      <td className="py-2">
        <div className="font-medium">{site.name}</div>
        <div className="text-xs text-muted-foreground">{site.url}</div>
      </td>
      <td className="py-2">
        <input
          type="checkbox"
          disabled={pending}
          checked={verified}
          onChange={(e) => {
            const next = e.target.checked
            setVerified(next)
            startTransition(async () => {
              const r = await setIndexNowVerified(site.id, next)
              if (!r.success) {
                setVerified(!next)
                alert(`Failed: ${r.error}`)
              }
            })
          }}
        />
      </td>
    </tr>
  )
}
