/**
 * Format a GBP amount for UI display.
 *
 * Currency convention is 2 decimal places. We never show 3dp or 4dp — £0.032 is not
 * a valid GBP display. When a real nonzero cost rounds to zero at 2dp, we show
 * "<£0.01" so the user knows it's nonzero-but-small instead of exactly zero.
 */
export function formatGbp(n: number): string {
  if (n === 0) return "£0.00"
  if (n > 0 && n < 0.005) return "<£0.01"
  if (n < 0 && n > -0.005) return ">−£0.01"
  return `£${n.toFixed(2)}`
}

/**
 * Format a GBP delta for "+/-£X.XX vs last" displays.
 */
export function formatGbpDelta(n: number): string {
  if (Math.abs(n) < 0.005) return "no change vs last"
  const sign = n >= 0 ? "+" : "−"
  return `${sign}£${Math.abs(n).toFixed(2)} vs last`
}

/**
 * Format a USD amount. Same 2dp convention.
 */
export function formatUsd(n: number): string {
  if (n === 0) return "$0.00"
  if (n > 0 && n < 0.005) return "<$0.01"
  return `$${n.toFixed(2)}`
}
