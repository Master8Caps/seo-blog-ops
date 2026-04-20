"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Globe,
  FileText,
  Activity,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/shared/logo"
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser"

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badgeKey: null as null | "activity" },
  { href: "/sites", label: "Sites", icon: Globe, badgeKey: null as null | "activity" },
  { href: "/content", label: "Content", icon: FileText, badgeKey: null as null | "activity" },
  { href: "/activity", label: "Activity", icon: Activity, badgeKey: "activity" as const },
  { href: "/costs", label: "Costs", icon: Wallet, badgeKey: null as null | "activity" },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
  activeJobCount?: number
}

export function Sidebar({ userEmail, userName, activeJobCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createSupabaseBrowserClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.charAt(0).toUpperCase() ?? "U"

  const isSettingsActive = pathname.startsWith("/settings")

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo + Collapse Toggle */}
        <div className={cn(
          "border-b border-border",
          collapsed
            ? "flex flex-col items-center gap-1 py-2"
            : "flex h-14 items-center justify-between px-3"
        )}>
          <Logo collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {mainNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const showBadge =
              item.badgeKey === "activity" && activeJobCount > 0
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="relative shrink-0">
                  <item.icon className="h-5 w-5" />
                  {showBadge && collapsed && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                          {activeJobCount}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={link} />
                  <TooltipContent side="right">
                    {item.label}
                    {showBadge && ` (${activeJobCount} running)`}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return link
          })}
        </nav>

        {/* Bottom Section: Settings + Separator + Profile */}
        <div className="mt-auto">
          {/* Settings Link */}
          <div className="px-2 pb-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/settings"
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isSettingsActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Settings className="h-5 w-5 shrink-0" />
                    </Link>
                  }
                />
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isSettingsActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span>Settings</span>
              </Link>
            )}
          </div>

          <Separator />

          {/* User Profile */}
          <div className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <div className="flex flex-col items-start min-w-0">
                        {userName && (
                          <span className="text-sm font-medium truncate w-full">
                            {userName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground truncate w-full">
                          {userEmail}
                        </span>
                      </div>
                    )}
                  </button>
                }
              />
              <DropdownMenuContent
                side={collapsed ? "right" : "top"}
                align="start"
                className="w-56"
              >
                {collapsed && (
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      {userName && (
                        <p className="text-sm font-medium">{userName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                )}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
