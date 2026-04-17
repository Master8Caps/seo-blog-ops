import { GoogleGenAI } from "@google/genai"
import { createClient } from "@supabase/supabase-js"

export interface ImagePrompt {
  section: string
  prompt: string
}

export interface GeneratedImage {
  section: string
  url: string
  alt: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  errors: string[]
}

/**
 * Create a Supabase client for storage writes.
 * Uses the service role key so uploads bypass RLS on the post-images bucket.
 */
function createStorageClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Generate images via Gemini Pro Image and upload to Supabase Storage.
 * Returns public URLs for each generated image.
 */
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview"

export async function generateAndUploadImages(
  postId: string,
  imagePrompts: ImagePrompt[]
): Promise<ImageGenerationResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    console.error("[image-generator] GOOGLE_AI_API_KEY is not configured")
    return {
      images: [],
      errors: ["GOOGLE_AI_API_KEY is not configured"],
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[image-generator] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key; uploads will likely fail on RLS"
    )
  }

  console.info(
    `[image-generator] post=${postId} starting (${imagePrompts.length} prompts, model=${GEMINI_IMAGE_MODEL})`
  )

  const ai = new GoogleGenAI({ apiKey })
  const supabase = createStorageClient()
  const images: GeneratedImage[] = []
  const errors: string[] = []

  for (const { section, prompt } of imagePrompts) {
    try {
      console.info(`[image-generator] post=${postId} section=${section} → Gemini`)
      const response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: `Generate a professional, high-quality blog image: ${prompt}. Style: clean, modern, suitable for a professional blog post. No text overlays.`,
        config: {
          // Gemini image generation requires both TEXT and IMAGE modalities
          responseModalities: ["TEXT", "IMAGE"],
        },
      })

      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find(
        (p) => p.inlineData?.mimeType?.startsWith("image/")
      )

      if (!imagePart?.inlineData) {
        const reason = response.candidates?.[0]?.finishReason ?? "no image in response"
        console.warn(
          `[image-generator] post=${postId} section=${section} ✗ no image returned (${reason})`
        )
        errors.push(`${section}: ${reason}`)
        continue
      }

      const buffer = Buffer.from(imagePart.inlineData.data!, "base64")
      const ext = imagePart.inlineData.mimeType === "image/webp" ? "webp" : "png"
      const filePath = `posts/${postId}/${section}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, buffer, {
          contentType: imagePart.inlineData.mimeType ?? "image/png",
          upsert: true,
        })

      if (uploadError) {
        console.error(
          `[image-generator] post=${postId} section=${section} ✗ upload failed: ${uploadError.message}`
        )
        errors.push(`${section} upload: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath)

      console.info(
        `[image-generator] post=${postId} section=${section} ✓ ${urlData.publicUrl}`
      )

      images.push({
        section,
        url: urlData.publicUrl,
        alt: prompt,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error(
        `[image-generator] post=${postId} section=${section} ✗ threw: ${message}`
      )
      errors.push(`${section}: ${message}`)
    }
  }

  console.info(
    `[image-generator] post=${postId} done (${images.length} ok, ${errors.length} errors)`
  )

  return { images, errors }
}

/** Replace image markers in markdown with actual URLs */
export function replaceImageMarkers(
  content: string,
  images: GeneratedImage[]
): string {
  let result = content
  const imageMap = new Map(images.map((img) => [img.section, img]))

  const featured = imageMap.get("featured")
  if (featured) {
    result = result.replace(
      /!\[featured\]\(IMAGE_FEATURED\)/g,
      `![${featured.alt}](${featured.url})`
    )
  }

  for (let i = 1; i <= 3; i++) {
    const img = imageMap.get(`section-${i}`)
    if (img) {
      result = result.replace(
        new RegExp(`!\\[section\\]\\(IMAGE_${i}\\)`, "g"),
        `![${img.alt}](${img.url})`
      )
    }
  }

  return result
}
