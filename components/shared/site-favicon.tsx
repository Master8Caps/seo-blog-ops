"use client"

import { useState } from "react"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface SiteFaviconProps {
  url: string
  logoUrl?: string | null
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

export function SiteFavicon({ url, logoUrl, size = 20, className }: SiteFaviconProps) {
  // Two-stage fallback: extracted logo → Google favicon → Globe icon
  const [primaryFailed, setPrimaryFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  const domain = getDomain(url)
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

  if (fallbackFailed || (!logoUrl && primaryFailed)) {
    return (
      <Globe
        className={cn("text-primary", className)}
        style={{ width: size, height: size }}
      />
    )
  }

  const src = logoUrl && !primaryFailed ? logoUrl : googleFavicon

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("rounded-sm object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => {
        if (logoUrl && !primaryFailed) {
          setPrimaryFailed(true)
        } else {
          setFallbackFailed(true)
        }
      }}
    />
  )
}
