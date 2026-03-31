"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"

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
}

export async function updateSite(input: UpdateSiteInput) {
  const { id, ...data } = input

  const site = await prisma.site.update({
    where: { id },
    data,
  })

  revalidatePath(`/sites/${id}`)
  revalidatePath("/sites")
  return site
}
