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

/** Create a Supabase client for storage (doesn't need cookies/auth context) */
function createStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Generate images via Gemini Pro Image and upload to Supabase Storage.
 * Returns public URLs for each generated image.
 */
export async function generateAndUploadImages(
  postId: string,
  imagePrompts: ImagePrompt[]
): Promise<GeneratedImage[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey })
  const supabase = createStorageClient()
  const images: GeneratedImage[] = []

  for (const { section, prompt } of imagePrompts) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: `Generate a professional, high-quality blog image: ${prompt}. Style: clean, modern, suitable for a professional blog post. No text overlays.`,
        config: {
          responseModalities: ["IMAGE"],
        },
      })

      // Extract image data from response
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find(
        (p) => p.inlineData?.mimeType?.startsWith("image/")
      )

      if (!imagePart?.inlineData) {
        console.error(`No image generated for section: ${section}`)
        continue
      }

      // Upload to Supabase Storage
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
        console.error(`Upload failed for ${section}:`, uploadError)
        continue
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath)

      images.push({
        section,
        url: urlData.publicUrl,
        alt: prompt,
      })
    } catch (error) {
      console.error(`Image generation failed for ${section}:`, error)
      // Continue with other images — don't fail the whole post
    }
  }

  return images
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
