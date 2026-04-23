import { prisma } from "@/lib/db/prisma"
import { encrypt, decrypt } from "@/lib/crypto"
import { createOAuth2Client } from "./client"

export async function storeRefreshToken(
  refreshToken: string,
  grantedScope: string,
  userEmail: string
): Promise<void> {
  const enc = encrypt(refreshToken)
  await prisma.googleAuth.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      refreshToken: enc,
      scope: grantedScope,
      connectedBy: userEmail,
    },
    update: {
      refreshToken: enc,
      scope: grantedScope,
      connectedBy: userEmail,
    },
  })
}

export async function clearGoogleAuth(): Promise<void> {
  try {
    await prisma.googleAuth.delete({ where: { id: "singleton" } })
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") return
    throw err
  }
}

export async function isConnected(): Promise<boolean> {
  const row = await prisma.googleAuth.findUnique({ where: { id: "singleton" } })
  return row !== null
}

export async function _readRefreshToken(): Promise<string | null> {
  const row = await prisma.googleAuth.findUnique({ where: { id: "singleton" } })
  if (!row) return null
  return decrypt(row.refreshToken)
}

let cachedToken: { value: string; expiresAt: number } | null = null
const SAFETY_MARGIN_MS = 5 * 60 * 1000

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > SAFETY_MARGIN_MS) {
    return cachedToken.value
  }

  const refreshToken = await _readRefreshToken()
  if (!refreshToken) {
    throw new Error("Google not connected — store a refresh token first")
  }

  const client = createOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error("Refresh response missing access_token or expiry_date")
  }

  cachedToken = {
    value: credentials.access_token,
    expiresAt: credentials.expiry_date,
  }
  return cachedToken.value
}

export function _resetTokenCache(): void {
  cachedToken = null
}
