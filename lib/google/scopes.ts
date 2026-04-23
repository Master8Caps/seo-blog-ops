// Scopes requested at OAuth consent. GA4 is reserved so the future Feature 1c
// build needs zero re-consent. Order matters only for display; functionally a set.
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/indexing",
  "https://www.googleapis.com/auth/analytics.readonly",
] as const

export const REQUIRED_SCOPES_FOR_GSC = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/indexing",
] as const
