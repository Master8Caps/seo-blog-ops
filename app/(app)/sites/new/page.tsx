"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { createSite, crawlAndAnalyzeSite } from "@/modules/sites/actions/create-site"
import { Globe, ArrowRight, Check, Loader2 } from "lucide-react"

type Step = "details" | "crawling" | "analyzing" | "complete"

export default function NewSitePage() {
  const [step, setStep] = useState<Step>("details")
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [siteId, setSiteId] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const createResult = await createSite({ url, name, description })
    if (!createResult.success || !createResult.siteId) {
      setError(createResult.error ?? "Failed to create site")
      return
    }

    setSiteId(createResult.siteId)
    setStep("crawling")

    setStep("analyzing")
    const analyzeResult = await crawlAndAnalyzeSite(createResult.siteId)
    if (!analyzeResult.success) {
      setError(analyzeResult.error ?? "Analysis failed")
      setStep("details")
      return
    }

    setStep("complete")
  }

  if (step === "crawling" || step === "analyzing") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="py-12">
            <LoadingSpinner
              message={
                step === "crawling"
                  ? "Crawling website pages..."
                  : "Analyzing content with AI..."
              }
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                <span>Site created</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {step === "crawling" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Check className="h-4 w-4 text-primary" />
                )}
                <span>Crawling pages</span>
              </div>
              {step === "analyzing" && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>AI analysis in progress</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "complete" && siteId) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Site analyzed!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your site has been crawled and an SEO profile has been generated.
              Review and edit the profile to fine-tune it.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => router.push(`/sites/${siteId}`)}>
                View SEO Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Add a Site</h1>
        <p className="text-muted-foreground">
          Enter your website URL and we&apos;ll analyze it automatically.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="url"
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Site Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Awesome Site"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="Brief description of what the site does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Helps the AI produce a better analysis. What does the business
                do?
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full">
              Crawl &amp; Analyze
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
