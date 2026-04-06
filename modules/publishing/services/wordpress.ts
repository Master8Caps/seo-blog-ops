// modules/publishing/services/wordpress.ts

interface WPUser {
  id: number
  name: string
  capabilities?: Record<string, boolean>
}

interface WPCategory {
  id: number
  name: string
  slug: string
}

interface WPTag {
  id: number
  name: string
  slug: string
}

interface WPPost {
  id: number
  link: string
  status: string
}

interface WPMediaItem {
  id: number
  source_url: string
}

export interface WPConnectionResult {
  success: boolean
  error?: string
  user?: { id: number; name: string }
  capabilities?: Record<string, boolean>
}

export interface WPTaxonomy {
  categories: { id: number; name: string; slug: string }[]
  tags: { id: number; name: string; slug: string }[]
}

function authHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString("base64")
  return `Basic ${encoded}`
}

function wpApiUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "")
  return `${base}/wp-json/wp/v2${path}`
}

/**
 * Test connection and verify the user has required capabilities.
 */
export async function testConnection(
  siteUrl: string,
  username: string,
  password: string
): Promise<WPConnectionResult> {
  try {
    const res = await fetch(wpApiUrl(siteUrl, "/users/me?context=edit"), {
      headers: { Authorization: authHeader(username, password) },
    })

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: "Invalid credentials. Check your username and application password." }
    }

    if (!res.ok) {
      return { success: false, error: `WordPress API returned ${res.status}. Is the REST API enabled?` }
    }

    const user = (await res.json()) as WPUser
    const caps = user.capabilities ?? {}

    if (!caps.edit_posts) {
      return {
        success: false,
        error: `User "${user.name}" doesn't have permission to create posts. Use an Editor or Author role.`,
      }
    }

    if (!caps.upload_files) {
      return {
        success: false,
        error: `User "${user.name}" doesn't have permission to upload media. Use an Editor or Author role.`,
      }
    }

    return {
      success: true,
      user: { id: user.id, name: user.name },
      capabilities: caps,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
      return { success: false, error: "Could not reach the WordPress site. Check the URL." }
    }
    return { success: false, error: `Connection failed: ${msg}` }
  }
}

/**
 * Fetch all categories and tags from WordPress (handles pagination).
 */
export async function syncTaxonomy(
  siteUrl: string,
  username: string,
  password: string
): Promise<WPTaxonomy> {
  const auth = authHeader(username, password)

  async function fetchAll<T>(endpoint: string): Promise<T[]> {
    const items: T[] = []
    let page = 1
    while (true) {
      const res = await fetch(
        wpApiUrl(siteUrl, `${endpoint}?per_page=100&page=${page}`),
        { headers: { Authorization: auth } }
      )
      if (!res.ok) break
      const data = (await res.json()) as T[]
      items.push(...data)
      const total = parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10)
      if (page >= total) break
      page++
    }
    return items
  }

  const [categories, tags] = await Promise.all([
    fetchAll<WPCategory>("/categories"),
    fetchAll<WPTag>("/tags"),
  ])

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  }
}

/**
 * Upload an image to the WordPress media library.
 */
export async function uploadMedia(
  siteUrl: string,
  username: string,
  password: string,
  imageBuffer: Buffer,
  filename: string
): Promise<WPMediaItem> {
  const res = await fetch(wpApiUrl(siteUrl, "/media"), {
    method: "POST",
    headers: {
      Authorization: authHeader(username, password),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "image/png",
    },
    body: new Uint8Array(imageBuffer),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Media upload failed (${res.status}): ${body}`)
  }

  return (await res.json()) as WPMediaItem
}

/**
 * Create a post on WordPress.
 */
export async function createPost(
  siteUrl: string,
  username: string,
  password: string,
  postData: {
    title: string
    content: string
    status: "publish" | "draft"
    featured_media?: number
    categories?: number[]
    tags?: number[]
  }
): Promise<WPPost> {
  const res = await fetch(wpApiUrl(siteUrl, "/posts"), {
    method: "POST",
    headers: {
      Authorization: authHeader(username, password),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Post creation failed (${res.status}): ${body}`)
  }

  return (await res.json()) as WPPost
}
