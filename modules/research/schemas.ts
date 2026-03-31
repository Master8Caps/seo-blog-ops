import { z } from "zod"

export const runResearchSchema = z.object({
  siteId: z.string().uuid(),
  seedKeywords: z.array(z.string()).min(1, "At least one seed keyword required"),
  locationCode: z.number().int().default(2826),
})

export const updateKeywordSchema = z.object({
  keywordId: z.string().uuid(),
  status: z.enum(["discovered", "approved", "used", "rejected"]),
})

export type RunResearchInput = z.infer<typeof runResearchSchema>
export type UpdateKeywordInput = z.infer<typeof updateKeywordSchema>
