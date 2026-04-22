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
      {collapsed ? (
        <svg
          viewBox="0 0 32 40"
          width="28"
          height="32"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 text-foreground"
          aria-label="SEO Blog Ops"
        >
          <circle
            cx="13"
            cy="18"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />
          <line
            x1="25"
            y1="30"
            x2="32"
            y2="37"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <>
          <svg
            viewBox="0 0 84 40"
            width="72"
            height="34"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 text-foreground"
            aria-label="SEO"
          >
            <text
              x="1"
              y="30"
              fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
              fontWeight="900"
              fontSize="34"
              letterSpacing="-1.5"
              fill="currentColor"
            >
              SE
            </text>
            <circle
              cx="60"
              cy="18"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
            />
            <line
              x1="72"
              y1="30"
              x2="79"
              y2="37"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none tracking-tight">
              Blog
            </span>
            <span className="mt-1 text-xs font-medium leading-none text-muted-foreground">
              Ops
            </span>
          </div>
        </>
      )}
    </Link>
  )
}
