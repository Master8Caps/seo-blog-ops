import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getPosts } from "@/modules/content/actions/get-posts"
import { GenerateContentButton } from "@/components/shared/generate-content-button"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  approved: { label: "Approved", className: "border-green-500/50 bg-green-500/10 text-green-400" },
  published: { label: "Published", className: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  rejected: { label: "Rejected", className: "border-red-500/50 bg-red-500/10 text-red-400" },
}

export default async function ContentPage() {
  const posts = await getPosts()

  // Group posts by site
  const siteGroups = new Map<
    string,
    {
      siteName: string
      siteSlug: string
      siteUrl: string
      posts: typeof posts
    }
  >()

  for (const post of posts) {
    const key = post.siteId
    if (!siteGroups.has(key)) {
      siteGroups.set(key, {
        siteName: post.site.name,
        siteSlug: post.site.slug,
        siteUrl: "",
        posts: [],
      })
    }
    siteGroups.get(key)!.posts.push(post)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content</h1>
          <p className="text-muted-foreground">
            Manage generated blog posts across all sites.
          </p>
        </div>
        <GenerateContentButton />
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
        <div className="space-y-8">
          {Array.from(siteGroups.entries()).map(([siteId, group]) => {
            const recentPosts = group.posts.slice(0, 3)
            const hasMore = group.posts.length > 3

            return (
              <div key={siteId}>
                {/* Site Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{group.siteName}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({group.posts.length} {group.posts.length === 1 ? "post" : "posts"})
                    </span>
                  </div>
                  {hasMore && (
                    <Link
                      href={`/sites/${group.siteSlug}/content`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      See all <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Post Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recentPosts.map((post) => {
                    const status = statusConfig[post.status] ?? statusConfig.draft
                    return (
                      <Link
                        key={post.id}
                        href={`/content/${post.id}`}
                        className="group block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/50"
                      >
                        {/* Featured Image */}
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {post.featuredImg ? (
                            <img
                              src={post.featuredImg}
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant="outline" className={`text-xs backdrop-blur-sm ${status.className}`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4">
                          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{post.keyword?.keyword ?? "—"}</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
