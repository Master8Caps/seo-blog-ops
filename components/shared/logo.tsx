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
          {/* Paper - slightly rotated for depth */}
          <rect
            x="5"
            y="3"
            width="13"
            height="17"
            rx="1.5"
            fill="currentColor"
            className="text-primary-foreground/30"
          />
          {/* Paper front */}
          <rect
            x="4"
            y="4"
            width="13"
            height="17"
            rx="1.5"
            fill="currentColor"
            className="text-primary-foreground"
          />
          {/* Text lines on paper */}
          <path
            d="M7 9H14M7 12H12M7 15H10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="text-primary"
          />
          {/* Pen - diagonal across the paper */}
          <path
            d="M14 7L19.5 1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary-foreground"
          />
          <path
            d="M13 8L14 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-primary-foreground/70"
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
