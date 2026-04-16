// modules/publishing/services/standard-api.ts
// Adapter for the universal /api/publish/ contract used by Manus and Claude-built Vercel sites.

export interface ApiCategory {
  slug: string
  name: string
}

export interface ApiContextGroup {
  label: string
  description: string
  items: { slug: string; name: string }[]
}

export interface ApiMetadata {
  categories: ApiCategory[]
  tags: string[]
  context: ApiContextGroup[]
}

export interface ApiPublishResult {
  success: boolean
  slug: string
  publishedUrl: string
  created: boolean
}

export interface ApiConnectionResult {
  success: boolean
  error?: string
  metadata?: ApiMetadata
}

function apiUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "")
  return `${base}/api/publish${path}`
}

function apiHeaders(apiKey: string, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = { "x-api-key": apiKey }
  if (contentType) headers["Content-Type"] = contentType
  return headers
}

/**
 * Test connection by fetching categories. If this works, the API key is valid.
 */
export async function testConnection(
  siteUrl: string,
  apiKey: string
): Promise<ApiConnectionResult> {
  try {
    const res = await fetch(apiUrl(siteUrl, "/metadata/categories"), {
      headers: apiHeaders(apiKey),
    })

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: "Invalid API key." }
    }

    if (!res.ok) {
      return { success: false, error: `API returned ${res.status}. Is the publish API set up?` }
    }

    // Connection works — fetch all metadata
    const metadata = await syncMetadata(siteUrl, apiKey)
    return { success: true, metadata }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
      return { success: false, error: "Could not reach the site. Check the URL." }
    }
    return { success: false, error: `Connection failed: ${msg}` }
  }
}

/**
 * Fetch categories, tags, and context from the metadata endpoints.
 */
export async function syncMetadata(
  siteUrl: string,
  apiKey: string
): Promise<ApiMetadata> {
  const headers = apiHeaders(apiKey)

  const [catRes, tagRes, ctxRes] = await Promise.all([
    fetch(apiUrl(siteUrl, "/metadata/categories"), { headers }),
    fetch(apiUrl(siteUrl, "/metadata/tags"), { headers }),
    fetch(apiUrl(siteUrl, "/metadata/context"), { headers }),
  ])

  const categories: ApiCategory[] = catRes.ok
    ? ((await catRes.json()) as { categories: ApiCategory[] }).categories
    : []

  const tags: string[] = tagRes.ok
    ? ((await tagRes.json()) as { tags: string[] }).tags
    : []

  const context: ApiContextGroup[] = ctxRes.ok
    ? ((await ctxRes.json()) as { context: ApiContextGroup[] }).context
    : []

  return { categories, tags, context }
}

/**
 * Publish or update an article via the standard API.
 */
export async function publishArticle(
  siteUrl: string,
  apiKey: string,
  payload: {
    slug: string
    title: string
    content: string
    excerpt?: string
    category?: string
    author?: string
    readingTime?: number
    featuredImage?: string
    tags?: string
    published?: boolean
    publishedAt?: string
  }
): Promise<ApiPublishResult> {
  const res = await fetch(apiUrl(siteUrl, "/article"), {
    method: "POST",
    headers: apiHeaders(apiKey, "application/json"),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Publish failed (${res.status}): ${body}`)
  }

  return (await res.json()) as ApiPublishResult
}

/**
 * Unpublish / delete an article by slug.
 */
export async function unpublishArticle(
  siteUrl: string,
  apiKey: string,
  slug: string
): Promise<void> {
  const res = await fetch(apiUrl(siteUrl, `/article/${encodeURIComponent(slug)}`), {
    method: "DELETE",
    headers: apiHeaders(apiKey),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Unpublish failed (${res.status}): ${body}`)
  }
}

/**
 * Upload an image to the site's media storage.
 */
export async function uploadMedia(
  siteUrl: string,
  apiKey: string,
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const formData = new FormData()
  formData.append("image", new Blob([new Uint8Array(imageBuffer)]), filename)

  const res = await fetch(apiUrl(siteUrl, "/media"), {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Media upload failed (${res.status}): ${body}`)
  }

  const result = (await res.json()) as { url: string }
  return result.url
}
