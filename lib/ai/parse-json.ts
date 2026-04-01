/**
 * Parse JSON from an AI response, stripping markdown code fences if present.
 * Claude sometimes wraps JSON in ```json ... ``` despite being told not to.
 */
export function parseAIJson<T>(text: string): T {
  let cleaned = text.trim()

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```\s*$/, "")
  }

  return JSON.parse(cleaned) as T
}
