import { GoogleGenAI } from "@google/genai"
import { logUsageEvent } from "./log"
import type { Attribution, Operation } from "./types"

const globalForGemini = globalThis as unknown as { __usageGemini?: GoogleGenAI }

const apiKey = process.env.GOOGLE_AI_API_KEY ?? ""
const geminiClient =
  globalForGemini.__usageGemini ?? new GoogleGenAI({ apiKey })

if (process.env.NODE_ENV !== "production") {
  globalForGemini.__usageGemini = geminiClient
}

export interface GenerateImageInput {
  model: string
  prompt: string
  operation: Operation
  attribution: Attribution
  metadata?: Record<string, unknown>
}

export interface GenerateImageResult {
  imageBytes: Buffer
  mimeType: string
}

/**
 * Wrapper around @google/genai image generation that logs a usage event per call.
 * Mirrors the extraction pattern used in modules/content/services/image-generator.ts:
 *   - calls ai.models.generateContent with responseModalities: ["TEXT", "IMAGE"]
 *   - finds the part whose inlineData.mimeType starts with "image/"
 *   - decodes base64 payload into a Buffer.
 * Success path logs imageCount: 1; failure path logs imageCount: 0 + errorMessage then re-throws.
 */
export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const start = Date.now()
  try {
    const response = await geminiClient.models.generateContent({
      model: input.model,
      contents: input.prompt,
      config: {
        // Gemini image generation requires both TEXT and IMAGE modalities
        responseModalities: ["TEXT", "IMAGE"],
      },
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p) =>
      p.inlineData?.mimeType?.startsWith("image/")
    )

    if (!imagePart?.inlineData?.data) {
      const reason =
        response.candidates?.[0]?.finishReason ?? "no image in response"
      throw new Error(`Gemini returned no image data: ${reason}`)
    }

    const mimeType = imagePart.inlineData.mimeType ?? "image/png"
    const imageBytes = Buffer.from(imagePart.inlineData.data, "base64")

    await logUsageEvent({
      provider: "gemini",
      model: input.model,
      operation: input.operation,
      units: { imageCount: 1 },
      attribution: input.attribution,
      durationMs: Date.now() - start,
      metadata: input.metadata,
    })

    return { imageBytes, mimeType }
  } catch (err) {
    await logUsageEvent({
      provider: "gemini",
      model: input.model,
      operation: input.operation,
      units: { imageCount: 0 },
      attribution: input.attribution,
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: input.metadata,
    })
    throw err
  }
}
