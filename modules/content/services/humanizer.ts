import { humanize } from "@/lib/usage/stealthgpt"

interface HumanizerOptions {
  keyword: string
  additionalKeywords?: string[]
  siteId?: string
  postId?: string
  jobId?: string
}

/**
 * Humanize markdown content via StealthGPT while preserving SEO keywords.
 *
 * Process:
 * 1. Split content into sections by H2 headings
 * 2. For each section: swap keywords with placeholders, strip markdown,
 *    humanize via StealthGPT, restore keywords and markdown structure
 * 3. Reassemble into full post
 *
 * StealthGPT calls go through `lib/usage/stealthgpt.humanize` so each per-section
 * call emits a `usage_events` row attributed to (siteId, postId, jobId).
 * One post with N sections produces N rows — that's by design for per-call attribution.
 */
export async function humanizeContent(
  markdownContent: string,
  options: HumanizerOptions
): Promise<string> {
  const keywords = [options.keyword, ...(options.additionalKeywords ?? [])]
  const sections = splitIntoSections(markdownContent)

  const humanizedSections: string[] = []

  for (const section of sections) {
    // Skip image markers and very short sections
    if (section.trim().length < 50 || section.startsWith("![")) {
      humanizedSections.push(section)
      continue
    }

    // Swap keywords with placeholders
    let text = section
    const placeholders: Map<string, string> = new Map()
    keywords.forEach((kw, i) => {
      const placeholder = `%%KW_${i}%%`
      placeholders.set(placeholder, kw)
      text = text.replace(new RegExp(escapeRegex(kw), "gi"), placeholder)
    })

    // Preserve markdown headings
    const headingMatch = text.match(/^(#{1,3}\s+.*)$/m)
    const heading = headingMatch ? headingMatch[0] : null
    const bodyText = heading ? text.replace(heading, "").trim() : text

    if (bodyText.length < 30) {
      humanizedSections.push(section)
      continue
    }

    // Call StealthGPT via the usage wrapper (logs a usage_events row per call)
    const result = await humanize({
      text: bodyText,
      operation: "humanize",
      attribution: {
        siteId: options.siteId,
        postId: options.postId,
        jobId: options.jobId,
      },
    })
    let humanized = result.humanized

    // Restore keywords from placeholders
    for (const [placeholder, kw] of placeholders) {
      humanized = humanized.replace(new RegExp(escapeRegex(placeholder), "g"), kw)
    }

    // Re-apply heading if present
    if (heading) {
      let restoredHeading = heading
      for (const [placeholder, kw] of placeholders) {
        restoredHeading = restoredHeading.replace(
          new RegExp(escapeRegex(placeholder), "g"),
          kw
        )
      }
      humanizedSections.push(`${restoredHeading}\n\n${humanized}`)
    } else {
      humanizedSections.push(humanized)
    }
  }

  return humanizedSections.join("\n\n")
}

/** Split markdown into sections by H2 headings, keeping image lines separate */
function splitIntoSections(markdown: string): string[] {
  const lines = markdown.split("\n")
  const sections: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.startsWith("## ") && current.length > 0) {
      sections.push(current.join("\n"))
      current = [line]
    } else if (line.startsWith("![")) {
      if (current.length > 0) {
        sections.push(current.join("\n"))
        current = []
      }
      sections.push(line)
    } else {
      current.push(line)
    }
  }

  if (current.length > 0) {
    sections.push(current.join("\n"))
  }

  return sections
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
