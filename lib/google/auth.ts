import { prisma } from "@/lib/db/prisma"
import { encrypt, decrypt } from "@/lib/crypto"

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
