import { CostPanel } from "@/components/costs/cost-panel"
import { PostDetailView } from "./post-detail-view"
import { PostPerformanceCard } from "@/modules/integrations/components/PostPerformanceCard"
import { getPostById } from "@/modules/content/actions/get-posts"

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const post = await getPostById(postId)

  return (
    <div className="space-y-6">
      <PostDetailView postId={postId} />
      {post?.publishedUrl && (
        <PostPerformanceCard postId={postId} publishedUrl={post.publishedUrl} />
      )}
      <CostPanel postId={postId} />
    </div>
  )
}
