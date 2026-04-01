"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"

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
    include: { site: { select: { slug: true } } },
  })
  revalidatePath(`/content/${postId}`)
  revalidatePath(`/sites/${post.site.slug}/content`)
  revalidatePath("/content")
  return post
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
