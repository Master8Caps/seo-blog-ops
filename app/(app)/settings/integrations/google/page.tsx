import { prisma } from "@/lib/db/prisma"
import { isConnected } from "@/lib/google/auth"
import { GoogleConnectionPanel } from "@/modules/integrations/components/GoogleConnectionPanel"
import { IndexNowPanel } from "@/modules/integrations/components/IndexNowPanel"

export const dynamic = "force-dynamic"

export default async function GoogleIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const params = await searchParams
  const connected = await isConnected()
  const auth = connected
    ? await prisma.googleAuth.findUnique({
        where: { id: "singleton" },
        select: { connectedAt: true, connectedBy: true, scope: true },
      })
    : null

  const sites = await prisma.site.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      url: true,
      gscProperty: true,
      indexNowVerified: true,
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <h1 className="text-2xl font-semibold">Google Integration</h1>

      {params.error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-900 text-sm">
          OAuth error: {params.error}
        </div>
      )}
      {params.connected === "1" && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-green-900 text-sm">
          ✓ Connected. Auto-match running in the background — refresh in a few seconds.
        </div>
      )}

      <GoogleConnectionPanel
        connected={connected}
        connectedBy={auth?.connectedBy ?? null}
        connectedAt={auth?.connectedAt ?? null}
        scopes={auth?.scope ?? null}
        sites={sites}
      />

      <IndexNowPanel sites={sites} indexNowKey={process.env.INDEXNOW_KEY ?? ""} />
    </div>
  )
}
