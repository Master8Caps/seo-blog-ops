"use server"

import { isEmailAllowed } from "@/lib/auth/whitelist"

export async function checkEmail(email: string): Promise<boolean> {
  return isEmailAllowed(email)
}
