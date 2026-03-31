const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isEmailAllowed(email: string): boolean {
  // If no whitelist is configured, allow all (dev convenience)
  if (ALLOWED_EMAILS.length === 0) return true
  return ALLOWED_EMAILS.includes(email.toLowerCase())
}
