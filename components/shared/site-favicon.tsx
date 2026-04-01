"use client"

import { useState } from "react"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface SiteFaviconProps {
  url: string
  size?: number
  className?: string
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0]
  }
}

export function SiteFavicon({ url, size = 20, className }: SiteFaviconProps) {
  const [failed, setFailed] = useState(false)
  const domain = getDomain(url)

  if (failed) {
    return <Globe className={cn("text-primary", className)} style={{ width: size, height: size }} />
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
      alt=""
      width={size}
      height={size}
      className={cn("rounded-sm", className)}
      onError={() => setFailed(true)}
    />
  )
}
