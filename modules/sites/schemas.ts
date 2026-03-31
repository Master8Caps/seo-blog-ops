import { z } from "zod"

export const createSiteSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .transform((url) => {
      // Normalize: ensure https, remove trailing slash
      if (!url.startsWith("http")) url = `https://${url}`
      return url.replace(/\/+$/, "")
    }),
  name: z.string().min(1, "Site name is required").max(100),
  description: z.string().max(500).optional(),
})

export const updateSiteProfileSchema = z.object({
  niche: z.string().min(1).optional(),
  audience: z.string().min(1).optional(),
  tone: z.string().min(1).optional(),
  topics: z.array(z.string()).optional(),
})

export type CreateSiteInput = z.infer<typeof createSiteSchema>
export type UpdateSiteProfileInput = z.infer<typeof updateSiteProfileSchema>
