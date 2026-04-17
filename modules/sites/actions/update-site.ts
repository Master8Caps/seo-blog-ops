"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { extractLogoUrl } from "../services/logo-extractor"

interface UpdateSiteInput {
  id: string
  name?: string
  url?: string
  description?: string
  niche?: string
  audience?: string
  tone?: string
  topics?: string[]
  autopilot?: boolean
  onboardingStatus?: string
  logoUrl?: string | null
}

export async function updateSite(input: UpdateSiteInput) {
  const { id, url, ...rest } = input

  const data: Omit<UpdateSiteInput, "id"> = { ...rest }
  if (url !== undefined) {
    const normalized = url.trim().replace(/\/+$/, "")
    try {
      const parsed = new URL(normalized)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("protocol")
      }
    } catch {
      throw new Error("Invalid URL — must start with http:// or https://")
    }
    data.url = normalized
  }

  const site = await prisma.site.update({
    where: { id },
    data,
  })

  revalidatePath(`/sites/${site.slug}`)
  revalidatePath("/sites")
  return site
}

export async function reextractLogo(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } })
  if (!site) return { success: false, error: "Site not found" }

  const logoUrl = await extractLogoUrl(site.url)
  if (!logoUrl) {
    return { success: false, error: "No logo could be detected on the homepage" }
  }

  await prisma.site.update({
    where: { id: siteId },
    data: { logoUrl },
  })

  revalidatePath(`/sites/${site.slug}`)
  revalidatePath("/sites")
  return { success: true, logoUrl }
}
