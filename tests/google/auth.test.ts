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

vi.mock("@/lib/google/client", () => ({
  createOAuth2Client: vi.fn(),
}))

import { createOAuth2Client } from "@/lib/google/client"
import { getAccessToken, _resetTokenCache } from "@/lib/google/auth"

describe("getAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetTokenCache()
  })

  it("throws when no refresh token stored", async () => {
    vi.mocked(prisma.googleAuth.findUnique).mockResolvedValueOnce(null)
    await expect(getAccessToken()).rejects.toThrow(/not connected/i)
  })

  it("uses cached token within TTL", async () => {
    vi.mocked(prisma.googleAuth.findUnique).mockResolvedValueOnce({
      id: "singleton",
      refreshToken: "enc(rt-xyz)",
    } as never)
    const refreshAccessToken = vi
      .fn()
      .mockResolvedValue({ credentials: { access_token: "at-1", expiry_date: Date.now() + 3600_000 } })
    vi.mocked(createOAuth2Client).mockReturnValue({
      setCredentials: vi.fn(),
      refreshAccessToken,
    } as never)

    expect(await getAccessToken()).toBe("at-1")
    expect(await getAccessToken()).toBe("at-1")
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it("refreshes when cache is past TTL", async () => {
    vi.mocked(prisma.googleAuth.findUnique).mockResolvedValue({
      id: "singleton",
      refreshToken: "enc(rt-xyz)",
    } as never)
    const refreshAccessToken = vi
      .fn()
      .mockResolvedValueOnce({ credentials: { access_token: "at-1", expiry_date: Date.now() - 1000 } })
      .mockResolvedValueOnce({ credentials: { access_token: "at-2", expiry_date: Date.now() + 3600_000 } })
    vi.mocked(createOAuth2Client).mockReturnValue({
      setCredentials: vi.fn(),
      refreshAccessToken,
    } as never)

    expect(await getAccessToken()).toBe("at-1")
    expect(await getAccessToken()).toBe("at-2")
    expect(refreshAccessToken).toHaveBeenCalledTimes(2)
  })
})
