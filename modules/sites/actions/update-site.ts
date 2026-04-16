"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { extractLogoUrl } from "../services/logo-extractor"

interface UpdateSiteInput {
  id: string
  name?: string
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
  const { id, ...data } = input

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
