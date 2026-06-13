import { createMarkdown } from '@deepnote/blocks'
import type { BlockVM } from '../shell/viewModels'
import { renderMarkdownToSafeHtml } from './renderMarkdown'

// Renders the seven `text-cell-*` kinds (p / h1 / h2 / h3 / bullet / todo / callout) as
// formatted prose (design Phase 4). It REUSES `@deepnote/blocks` to derive the markdown for
// the block — the public `createMarkdown` entry, which for any text-cell kind delegates to
// `createMarkdownForTextBlock` (heading → `#`, bullet → `-`, to-do → `- [ ]`, callout →
// `>`, paragraph → escaped text) — then renders + sanitizes that markdown through the same
// shared seam the markdown renderer uses. Reusing the persistence package's own derivation
// keeps the viewer's text rendering in lockstep with how the file format defines these
// cells, instead of re-deriving the mapping in the SPA (the ADR-007 §6 "don't re-declare"
// discipline, applied to behaviour as well as types).
export interface TextRendererProps {
  block: BlockVM
}

export function TextRenderer({ block }: TextRendererProps) {
  // `createMarkdown` narrows on `block.type` internally; the SPA's `BlockVM` is the same
  // `DeepnoteBlock` union it expects, so the call is type-safe for every text-cell kind.
  const markdown = createMarkdown(block)
  const html = renderMarkdownToSafeHtml(markdown)
  return (
    <div
      className='text-renderer'
      data-text-kind={block.type}
      // Sanitized at the `renderMarkdownToSafeHtml` seam (DOMPurify) before injection.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: prose must render as DOM; the HTML is sanitized.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
