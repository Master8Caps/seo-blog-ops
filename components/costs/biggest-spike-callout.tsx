import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { formatGbp } from "@/lib/format"

interface BiggestSpikeCalloutProps {
  spike: {
    costGbp: number
    date: Date
    itemTitle: string
    itemLink: string
  } | null
}

export function BiggestSpikeCallout({ spike }: BiggestSpikeCalloutProps) {
  if (!spike) return null
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm">
      <AlertTriangle className="size-4 text-amber-400" />
      <span className="text-muted-foreground">Biggest spike (last 30 days):</span>
      <Link href={spike.itemLink} className="text-blue-400 hover:underline">
        {spike.itemTitle}
      </Link>
      <span className="ml-auto font-medium">{formatGbp(spike.costGbp)}</span>
      <span className="text-xs text-muted-foreground">
        {spike.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
      </span>
    </div>
  )
}
