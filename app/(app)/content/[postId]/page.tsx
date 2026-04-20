import { CostPanel } from "@/components/costs/cost-panel"
import { PostDetailView } from "./post-detail-view"

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params

  return (
    <div className="space-y-6">
      <PostDetailView postId={postId} />
      <CostPanel postId={postId} />
    </div>
  )
}
