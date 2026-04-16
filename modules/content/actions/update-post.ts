"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { queuePostPublish } from "./queue-generation"

export async function updatePostContent(postId: string, content: string) {
  const post = await prisma.post.update({
    where: { id: postId },
    data: { content },
    include: { site: { select: { slug: true } } },
  })
  revalidatePath(`/content/${postId}`)
  revalidatePath(`/sites/${post.site.slug}/content`)
  revalidatePath("/content")
  return post
}

export async function approvePost(postId: string, approvedBy: string) {
  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      status: "approved",
      approvedBy,
      approvedAt: new Date(),
    },
    include: { site: true },
  })

  revalidatePath(`/content/${postId}`)
  revalidatePath(`/sites/${post.site.slug}/content`)
  revalidatePath("/content")

  // Auto-publish if site has it enabled
  const config = post.site.publishConfig as Record<string, unknown> | null
  if (
    post.site.publishType &&
    config?.autoPublishOnApproval === true
  ) {
    await queuePostPublish(postId)
  }

  return post
}

export async function deletePost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { site: { select: { slug: true } } },
  })
  if (!post) return

  await prisma.post.delete({ where: { id: postId } })
  revalidatePath(`/sites/${post.site.slug}/content`)
  revalidatePath("/content")
}

export async function rejectPost(postId: string, reviewNotes: string) {
  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      status: "rejected",
      reviewNotes,
    },
    include: { site: { select: { slug: true } } },
  })
  revalidatePath(`/content/${postId}`)
  revalidatePath(`/sites/${post.site.slug}/content`)
  revalidatePath("/content")
  return post
}
