"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed, className }: LogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-3", className)}>
      {/* Icon — pen nib that doubles as an upward arrow */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/25">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pen body / upward arrow shape */}
          <path
            d="M12 3L8 8H10.5V14H13.5V8H16L12 3Z"
            fill="currentColor"
            className="text-primary-foreground"
          />
          {/* Pen nib / writing tip */}
          <path
            d="M10 15.5L12 20L14 15.5H10Z"
            fill="currentColor"
            className="text-primary-foreground/80"
          />
          {/* Writing line */}
          <path
            d="M7 21H17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary-foreground/60"
          />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-none tracking-tight">
            SEO Blog
          </span>
          <span className="text-xs font-medium leading-none text-muted-foreground mt-1">
            Ops
          </span>
        </div>
      )}
    </Link>
  )
}
