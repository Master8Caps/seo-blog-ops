"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Search, FileText, Send, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

interface SiteTabsProps {
  siteSlug: string
}

const tabs = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Research", href: "/research", icon: Search },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Publishing", href: "/publishing", icon: Send },
  { label: "Costs", href: "/costs", icon: Wallet },
]

export function SiteTabs({ siteSlug }: SiteTabsProps) {
  const pathname = usePathname()
  const basePath = `/sites/${siteSlug}`

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const tabPath = `${basePath}${tab.href}`
        const isActive =
          tab.href === ""
            ? pathname === basePath
            : pathname.startsWith(tabPath)

        return (
          <Link
            key={tab.label}
            href={tabPath}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
