import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/usage/anthropic", () => ({
  createMessage: vi.fn(),
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    keywordAngle: {
      findMany: vi.fn(),
    },
  },
}))

import { createMessage } from "@/lib/usage/anthropic"
import { prisma } from "@/lib/db/prisma"
import { selectAngleForKeyword } from "./select-angle"

describe("selectAngleForKeyword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when the keyword has no angles", async () => {
    vi.mocked(prisma.keywordAngle.findMany).mockResolvedValueOnce([])

    const result = await selectAngleForKeyword({
      keywordId: "kw-1",
      primaryKeyword: "x",
      siteId: "site-1",
      siteNiche: "y",
      recentClusterPosts: [],
    })

    expect(result).toBeNull()
    expect(createMessage).not.toHaveBeenCalled()
  })

  it("returns the matched angle when Claude picks a valid id", async () => {
    vi.mocked(prisma.keywordAngle.findMany).mockResolvedValueOnce([
      { id: "a1", text: "for toddlers", _count: { posts: 3 } },
      { id: "a2", text: "DIY budget", _count: { posts: 0 } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any)
    vi.mocked(createMessage).mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"angleId":"a2","reasoning":"lowest count, good fit"}',
        },
      ],
      usage: { input_tokens: 50, output_tokens: 20 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await selectAngleForKeyword({
      keywordId: "kw-1",
      primaryKeyword: "unicorn party ideas",
      siteId: "site-1",
      siteNiche: "kids parties",
      recentClusterPosts: [],
    })

    expect(result).toEqual({ id: "a2", text: "DIY budget" })
  })

  it("falls back to the lowest-count angle when Claude returns an invalid id", async () => {
    vi.mocked(prisma.keywordAngle.findMany).mockResolvedValueOnce([
      { id: "a1", text: "for toddlers", _count: { posts: 3 } },
      { id: "a2", text: "DIY budget", _count: { posts: 0 } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any)
    vi.mocked(createMessage).mockResolvedValueOnce({
      content: [{ type: "text", text: '{"angleId":"bogus","reasoning":"x"}' }],
      usage: { input_tokens: 50, output_tokens: 20 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await selectAngleForKeyword({
      keywordId: "kw-1",
      primaryKeyword: "x",
      siteId: "site-1",
      siteNiche: "y",
      recentClusterPosts: [],
    })

    expect(result).toEqual({ id: "a2", text: "DIY budget" })
  })
})
