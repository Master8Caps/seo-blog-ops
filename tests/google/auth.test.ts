import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    googleAuth: {
      upsert: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((s: string) => `enc(${s})`),
  decrypt: vi.fn((s: string) => s.replace(/^enc\(|\)$/g, "")),
}))

import { prisma } from "@/lib/db/prisma"
import { storeRefreshToken, clearGoogleAuth, isConnected } from "@/lib/google/auth"

describe("storeRefreshToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("encrypts the refresh token before persisting", async () => {
    await storeRefreshToken("rt-xyz", "scope-a scope-b", "user@example.com")
    expect(prisma.googleAuth.upsert).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        refreshToken: "enc(rt-xyz)",
        scope: "scope-a scope-b",
        connectedBy: "user@example.com",
      },
      update: {
        refreshToken: "enc(rt-xyz)",
        scope: "scope-a scope-b",
        connectedBy: "user@example.com",
      },
    })
  })
})

describe("clearGoogleAuth", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes the singleton row", async () => {
    await clearGoogleAuth()
    expect(prisma.googleAuth.delete).toHaveBeenCalledWith({ where: { id: "singleton" } })
  })

  it("swallows P2025 (row not found)", async () => {
    vi.mocked(prisma.googleAuth.delete).mockRejectedValueOnce(
      Object.assign(new Error("not found"), { code: "P2025" })
    )
    await expect(clearGoogleAuth()).resolves.toBeUndefined()
  })
})

describe("isConnected", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true when singleton row exists", async () => {
    vi.mocked(prisma.googleAuth.findUnique).mockResolvedValueOnce({
      id: "singleton",
    } as never)
    expect(await isConnected()).toBe(true)
  })

  it("returns false when no row", async () => {
    vi.mocked(prisma.googleAuth.findUnique).mockResolvedValueOnce(null)
    expect(await isConnected()).toBe(false)
  })
})
