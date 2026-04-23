import { extractDomain, normalizeUrl } from "./url-normalize"

export function scoreMatch(siteUrl: string, gscProperty: string): number {
  const siteDomain = extractDomain(siteUrl)
  const propDomain = extractDomain(gscProperty)

  if (gscProperty.startsWith("http")) {
    if (normalizeUrl(siteUrl) === normalizeUrl(gscProperty)) return 100
  }

  if (gscProperty.startsWith("sc-domain:")) {
    if (siteDomain === propDomain) return 95
    if (siteDomain.endsWith(`.${propDomain}`)) return 70
  }

  return 0
}
