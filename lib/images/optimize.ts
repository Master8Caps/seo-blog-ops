import sharp from "sharp"

export interface OptimizeOptions {
  /** Max width in pixels. Default 1200. Image is resized down (no upscale). */
  maxWidth?: number
  /** Max height in pixels. Default 1200. Image is resized down (no upscale). */
  maxHeight?: number
  /** Output format. Default 'webp'. */
  format?: "webp" | "jpeg" | "png"
  /** Quality 1-100. Default 80. Ignored for PNG. */
  quality?: number
}

export interface OptimizeResult {
  buffer: Buffer
  mimeType: string
  dimensions: { width: number; height: number }
  originalBytes: number
  finalBytes: number
}

const MIME_BY_FORMAT: Record<NonNullable<OptimizeOptions["format"]>, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
}

/**
 * Resize-down (no upscale) + format conversion + quality reduction in one pass.
 * Strips metadata. Returns the new buffer plus telemetry useful for logging
 * compression ratios.
 *
 * Pure function — does not perform I/O beyond sharp's in-memory work.
 */
export async function optimizeImage(
  input: Buffer,
  options: OptimizeOptions = {}
): Promise<OptimizeResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    format = "webp",
    quality = 80,
  } = options

  let pipeline = sharp(input).resize({
    width: maxWidth,
    height: maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  })

  if (format === "webp") {
    pipeline = pipeline.webp({ quality })
  } else if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true })
  } else {
    pipeline = pipeline.png()
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    mimeType: MIME_BY_FORMAT[format],
    dimensions: { width: info.width, height: info.height },
    originalBytes: input.length,
    finalBytes: data.length,
  }
}
