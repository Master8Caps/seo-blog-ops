"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"

export async function deleteSite(id: string) {
  await prisma.site.delete({ where: { id } })
  revalidatePath("/sites")
  redirect("/sites")
}
