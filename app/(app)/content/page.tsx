import Link from "next/link"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getPosts } from "@/modules/content/actions/get-posts"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  approved: { label: "Approved", className: "border-green-500/50 bg-green-500/10 text-green-400" },
  published: { label: "Published", className: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  rejected: { label: "Rejected", className: "border-red-500/50 bg-red-500/10 text-red-400" },
}

export default async function ContentPage() {
  const posts = await getPosts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground">
          Manage generated blog posts across all sites.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No content yet</p>
          <p className="text-sm text-muted-foreground">
            Generate posts from approved keywords on your sites.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium">Site</th>
                <th className="p-3 font-medium">Keyword</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const status = statusConfig[post.status] ?? statusConfig.draft
                return (
                  <tr key={post.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <Link
                        href={`/content/${post.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {post.site.name}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {post.keyword?.keyword ?? "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
