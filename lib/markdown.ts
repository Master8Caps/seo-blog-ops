import { marked } from "marked"

marked.setOptions({
  gfm: true,
  breaks: false,
})

/**
 * Render markdown to HTML. Used by the editor preview and by every
 * publishing adapter so both render identically.
 *
 * Defers to marked for real CommonMark + GFM support — headings h1-h6,
 * ordered/unordered lists, `*` and `-` bullets, tables, code, links,
 * inline HTML. The previous hand-rolled regex converter handled only
 * h1-h3 + `-` bullets and silently dropped everything else as literal text.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md) as string
}
