import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/usage/anthropic", () => ({
  createMessage: vi.fn(),
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    keywordAngle: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { createMessage } from "@/lib/usage/anthropic"
import { prisma } from "@/lib/db/prisma"
import { generateAnglesForKeyword } from "./generate-angles"

describe("generateAnglesForKeyword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses Claude's response and writes angle rows", async () => {
    vi.mocked(createMessage).mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"angles":["for toddlers","DIY budget","outdoor themed"]}',
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(prisma.keywordAngle.createMany).mockResolvedValueOnce({ count: 3 })

    const result = await generateAnglesForKeyword({
      keywordId: "kw-1",
      keyword: "unicorn party ideas",
      siteId: "site-1",
      siteNiche: "kids parties",
      siteAudience: "parents",
      cluster: "themes",
    })

    expect(result.success).toBe(true)
    expect(result.count).toBe(3)
    expect(prisma.keywordAngle.createMany).toHaveBeenCalledWith({
      data: [
        { keywordId: "kw-1", text: "for toddlers" },
        { keywordId: "kw-1", text: "DIY budget" },
        { keywordId: "kw-1", text: "outdoor themed" },
      ],
    })
  })

  it("returns success:false when Claude returns malformed JSON", async () => {
    vi.mocked(createMessage).mockResolvedValueOnce({
      content: [{ type: "text", text: "not valid json" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await generateAnglesForKeyword({
      keywordId: "kw-1",
      keyword: "x",
      siteId: "site-1",
      siteNiche: "y",
      siteAudience: "z",
      cluster: null,
    })

    expect(result.success).toBe(false)
    expect(prisma.keywordAngle.createMany).not.toHaveBeenCalled()
  })

  it("deletes existing angles before inserting when replace:true", async () => {
    vi.mocked(createMessage).mockResolvedValueOnce({
      content: [{ type: "text", text: '{"angles":["a","b"]}' }],
      usage: { input_tokens: 10, output_tokens: 10 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(prisma.keywordAngle.deleteMany).mockResolvedValueOnce({ count: 5 })
    vi.mocked(prisma.keywordAngle.createMany).mockResolvedValueOnce({ count: 2 })

    await generateAnglesForKeyword({
      keywordId: "kw-1",
      keyword: "x",
      siteId: "site-1",
      siteNiche: "y",
      siteAudience: "z",
      cluster: null,
      replace: true,
    })

    expect(prisma.keywordAngle.deleteMany).toHaveBeenCalledWith({
      where: { keywordId: "kw-1" },
    })
  })
})
