"use client"

import { useState } from "react"
import { Zap } from "lucide-react"
import { updateSite } from "@/modules/sites/actions/update-site"

interface AutopilotToggleProps {
  siteId: string
  initialValue: boolean
}

export function AutopilotToggle({ siteId, initialValue }: AutopilotToggleProps) {
  const [enabled, setEnabled] = useState(initialValue)
  const [updating, setUpdating] = useState(false)

  async function handleToggle() {
    setUpdating(true)
    const newValue = !enabled
    await updateSite({ id: siteId, autopilot: newValue })
    setEnabled(newValue)
    setUpdating(false)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Zap className={`h-4 w-4 ${enabled ? "text-amber-400" : "text-muted-foreground"}`} />
        <div>
          <p className="font-medium">Autopilot</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? "Generates 1 post/week automatically" : "Manual generation only"}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={updating}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
          enabled ? "bg-primary" : "bg-muted"
        } ${updating ? "opacity-50" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
