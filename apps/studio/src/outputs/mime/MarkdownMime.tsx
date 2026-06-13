import { renderMarkdownToSafeHtml } from '../../blocks/renderMarkdown'
import { coerceMultilineString } from './multiline'

// `text/markdown` bundle renderer. Reuses the SHARED markdown→safe-HTML seam
// (`renderMarkdownToSafeHtml`) that the markdown/text block renderers funnel through, so
// markdown parsing AND DOMPurify sanitization are defined once for the whole app rather
// than re-derived here (design Phase 4 seam; "reuse the existing sanitizer seam where
// sensible" per the card). A non-string payload renders nothing.
export function MarkdownMime({ data }: { data: unknown }) {
  const markdown = coerceMultilineString(data)
  if (markdown == null) return null
  const html = renderMarkdownToSafeHtml(markdown)
  return (
    <div
      className='output-mime output-mime--markdown'
      // Parsed + DOMPurify-sanitized at the shared seam before injection.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown HTML is sanitized at the shared seam.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
