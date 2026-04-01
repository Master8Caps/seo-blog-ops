/**
 * Generate a URL-friendly slug from a site URL.
 * e.g. "https://northbarengineer.co.uk" → "northbarengineer"
 *      "https://www.my-blog.com" → "my-blog"
 */
export function slugFromUrl(url: string): string {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    hostname = url.replace(/^https?:\/\//, "").split("/")[0]
  }

  // Strip www. prefix
  hostname = hostname.replace(/^www\./, "")

  // Take the first segment (before the first dot)
  // This handles: northbarengineer.co.uk → northbarengineer
  //               my-blog.com → my-blog
  //               example.org → example
  const slug = hostname.split(".")[0]

  // Sanitize: lowercase, replace non-alphanumeric with hyphens, trim hyphens
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
