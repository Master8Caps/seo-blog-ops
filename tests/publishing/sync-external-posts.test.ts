import { describe, it, expect } from "vitest"
import { mergePostsForUpsert } from "@/modules/publishing/services/sync-external-posts"
import type { ExternalPostData } from "@/modules/publishing/services/wordpress"

const stub = (id: string, title: string): ExternalPostData => ({
  externalId: id,
  slug: title.toLowerCase(),
  title,
  url: `https://x/${title.toLowerCase()}`,
  excerpt: null,
  category: null,
  tags: null,
  publishedAt: null,
})

describe("mergePostsForUpsert", () => {
  it("returns one record per unique externalId, last-write-wins on dupes", () => {
    const out = mergePostsForUpsert([stub("1", "A"), stub("2", "B"), stub("1", "A2")])
    expect(out).toHaveLength(2)
    const titles = out.map((p) => p.title).sort()
    expect(titles).toEqual(["A2", "B"])
  })

  it("preserves original order for unique entries", () => {
    const out = mergePostsForUpsert([stub("3", "C"), stub("1", "A"), stub("2", "B")])
    expect(out.map((p) => p.externalId)).toEqual(["3", "1", "2"])
  })

  it("returns empty array for empty input", () => {
    expect(mergePostsForUpsert([])).toEqual([])
  })
})
