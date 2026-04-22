"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  backfillAngles,
  type BackfillAnglesResult,
} from "@/modules/research/actions/backfill-angles"

export default function BackfillAnglesPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BackfillAnglesResult | null>(null)

  async function handleRun() {
    setRunning(true)
    setResult(null)
    try {
      const r = await backfillAngles()
      setResult(r)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Backfill keyword angles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generates 8-15 rotation angles for every approved keyword that has
          none yet. Runs sequentially — expect ~3-5 seconds per keyword.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run backfill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRun} disabled={running}>
            {running ? "Running..." : "Start backfill"}
          </Button>

          {result && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Total candidates:</strong> {result.total}
              </p>
              <p>
                <strong>Successful:</strong> {result.successful}
              </p>
              <p>
                <strong>Failed:</strong> {result.failed}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="font-semibold text-destructive">Errors:</p>
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {result.errors.map((e) => (
                      <li key={e.keywordId}>
                        {e.keyword}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
