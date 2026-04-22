import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db/prisma"
import { getRecentKeywordsAndClusters } from "./get-recent-keywords"

describe("getRecentKeywordsAndClusters", () => {
  it("returns unique keyword strings and non-null clusters from recent posts", async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValueOnce([
      { keyword: { keyword: "cake ideas", cluster: "baking" } },
      { keyword: { keyword: "cake ideas", cluster: "baking" } },
      { keyword: { keyword: "party ideas", cluster: "events" } },
      { keyword: { keyword: "decor tips", cluster: null } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any)

    const result = await getRecentKeywordsAndClusters("site-1")

    expect(result.keywords.sort()).toEqual(["cake ideas", "decor tips", "party ideas"])
    expect(result.clusters.sort()).toEqual(["baking", "events"])
  })

  it("returns empty arrays when no recent posts exist", async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValueOnce([])
    const result = await getRecentKeywordsAndClusters("site-1")
    expect(result.keywords).toEqual([])
    expect(result.clusters).toEqual([])
  })
})
