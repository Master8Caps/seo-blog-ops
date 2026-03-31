import { FileText } from "lucide-react"

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground">
          Review and manage blog posts across all sites.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">No content yet</p>
        <p className="text-sm text-muted-foreground">
          Content will appear here once you add sites and generate posts.
        </p>
      </div>
    </div>
  )
}
