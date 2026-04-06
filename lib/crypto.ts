import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getKey(): Buffer {
  const key = process.env.PUBLISH_ENCRYPTION_KEY
  if (!key) throw new Error("PUBLISH_ENCRYPTION_KEY env var is required")
  return Buffer.from(key, "base64")
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`
}

export function decrypt(encrypted: string): string {
  const key = getKey()
  const [ivB64, dataB64, tagB64] = encrypted.split(":")
  const iv = Buffer.from(ivB64, "base64")
  const data = Buffer.from(dataB64, "base64")
  const tag = Buffer.from(tagB64, "base64")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final("utf8")
}
