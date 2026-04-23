import Link from "next/link"
import { prisma } from "@/lib/db/prisma"
import { isConnected } from "@/lib/google/auth"
import { ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const googleConnected = await isConnected()
  const linkedSites = googleConnected
    ? await prisma.site.count({ where: { gscProperty: { not: null } } })
    : 0
  const totalSites = await prisma.site.count()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and app settings.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Integrations</h2>
        <div className="space-y-3">
          <Link
            href="/settings/integrations/google"
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10 text-blue-500 font-semibold">
                G
              </div>
              <div>
                <div className="font-medium">Google</div>
                <div className="text-xs text-muted-foreground">
                  {googleConnected
                    ? `Connected · ${linkedSites} of ${totalSites} sites linked to GSC`
                    : "Connect Google account for Search Console + auto-indexing"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    </div>
  )
}
