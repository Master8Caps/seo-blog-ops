export function normalizeUrl(input: string): string {
  let url = input.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  const u = new URL(url)
  let host = u.host.toLowerCase()
  if (host.startsWith("www.")) host = host.slice(4)
  let path = u.pathname.replace(/\/+/g, "/")
  if (path.endsWith("/") && path.length > 1) path = path.slice(0, -1)
  return `${u.protocol}//${host}${path === "/" ? "" : path}`
}

export function extractDomain(input: string): string {
  if (input.startsWith("sc-domain:")) {
    return input.slice("sc-domain:".length).toLowerCase()
  }
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`)
    let host = u.host.toLowerCase()
    if (host.startsWith("www.")) host = host.slice(4)
    return host
  } catch {
    return input.toLowerCase()
  }
}
