import type { BlockVM } from '../shell/viewModels'
import { renderMarkdownToSafeHtml } from './renderMarkdown'

// Renders a `markdown` block's persisted content as formatted prose (design Phase 4). The
// content is markdown source; we parse + sanitize it through the shared seam and inject the
// safe HTML. Read-only: prose out, no editor — the SPA is a viewer (R8 posture).
export interface MarkdownRendererProps {
  block: BlockVM
}

export function MarkdownRenderer({ block }: MarkdownRendererProps) {
  const source = block.content ?? ''
  const html = renderMarkdownToSafeHtml(source)
  return (
    <div
      className='markdown-renderer'
      // Sanitized at the `renderMarkdownToSafeHtml` seam (DOMPurify) before injection.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: prose must render as DOM; the HTML is sanitized.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
