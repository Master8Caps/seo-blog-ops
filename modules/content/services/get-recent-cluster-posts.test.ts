import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db/prisma"
import { getRecentClusterPosts } from "./get-recent-cluster-posts"

describe("getRecentClusterPosts", () => {
  it("returns empty array when cluster is null", async () => {
    const result = await getRecentClusterPosts("site-1", null)
    expect(result).toEqual([])
    expect(prisma.post.findMany).not.toHaveBeenCalled()
  })

  it("queries posts in the cluster scoped to the site", async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValueOnce([
      {
        title: "Unicorn party games",
        excerpt: "Fun ideas",
        angle: { text: "for toddlers" },
      },
      {
        title: "DIY unicorn decorations",
        excerpt: "Budget friendly",
        angle: null,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any)

    const result = await getRecentClusterPosts("site-1", "themes")

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: "site-1", keyword: { cluster: "themes" } },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    )
    expect(result).toEqual([
      { title: "Unicorn party games", excerpt: "Fun ideas", angle: "for toddlers" },
      { title: "DIY unicorn decorations", excerpt: "Budget friendly", angle: null },
    ])
  })
})
