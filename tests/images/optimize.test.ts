import { describe, it, expect, beforeAll } from "vitest"
import sharp from "sharp"
import { optimizeImage } from "@/lib/images/optimize"

let bigPng: Buffer
let smallPng: Buffer

beforeAll(async () => {
  // Big test image: 2000x2000 solid red PNG
  bigPng = await sharp({
    create: { width: 2000, height: 2000, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()

  // Small test image: 400x300 solid blue PNG
  smallPng = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .png()
    .toBuffer()
})

describe("optimizeImage", () => {
  it("converts to WebP by default with quality 80", async () => {
    const result = await optimizeImage(bigPng)
    expect(result.mimeType).toBe("image/webp")
    expect(result.buffer.length).toBeLessThan(bigPng.length)
  })

  it("caps dimensions at maxWidth/maxHeight by default 1200", async () => {
    const result = await optimizeImage(bigPng)
    expect(result.dimensions.width).toBeLessThanOrEqual(1200)
    expect(result.dimensions.height).toBeLessThanOrEqual(1200)
  })

  it("does not upscale images smaller than the max bounds", async () => {
    const result = await optimizeImage(smallPng)
    expect(result.dimensions.width).toBe(400)
    expect(result.dimensions.height).toBe(300)
  })

  it("reports originalBytes and finalBytes for compression telemetry", async () => {
    const result = await optimizeImage(bigPng)
    expect(result.originalBytes).toBe(bigPng.length)
    expect(result.finalBytes).toBe(result.buffer.length)
    expect(result.finalBytes).toBeLessThan(result.originalBytes)
  })

  it("respects custom maxWidth", async () => {
    const result = await optimizeImage(bigPng, { maxWidth: 800, maxHeight: 800 })
    expect(result.dimensions.width).toBeLessThanOrEqual(800)
    expect(result.dimensions.height).toBeLessThanOrEqual(800)
  })

  it("supports JPEG output format", async () => {
    const result = await optimizeImage(bigPng, { format: "jpeg" })
    expect(result.mimeType).toBe("image/jpeg")
  })
})
