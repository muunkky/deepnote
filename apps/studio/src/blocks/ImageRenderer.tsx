import { createMarkdown } from '@deepnote/blocks'
import DOMPurify from 'dompurify'
import type { BlockVM } from '../shell/viewModels'

// Renders an `image` block read-only (design Phase 7). An image block has no execution and
// no persisted `outputs` — its source lives in `deepnote_img_src` metadata. We REUSE the
// public `@deepnote/blocks` `createMarkdown` entry (which for an `image` block delegates to
// `createMarkdownForImageBlock` — it attribute-escapes the src and validates width/alignment
// into `<img>` markup), then SANITIZE that markup with DOMPurify before injection so an
// untrusted `javascript:`/`onerror` src cannot reach the DOM live (design Decision 2 — "src
// sanitized"). Reusing the persistence package's own image derivation keeps the viewer in
// lockstep with the file format rather than re-deriving the mapping in the SPA.
export interface ImageRendererProps {
  block: BlockVM
}

export function ImageRenderer({ block }: ImageRendererProps) {
  // Defensive: the registry only dispatches `image` blocks here, but guard so a stray type
  // never trips `createMarkdown`'s unsupported-type throw and blanks the notebook view.
  if (block.type !== 'image') return null

  const rawImgMarkup = createMarkdown(block)
  // Sanitize: DOMPurify strips dangerous URL schemes (`javascript:`) and event-handler
  // attributes (`onerror`) while preserving a plain `<img src>` (http/https/data URIs).
  const safe = DOMPurify.sanitize(rawImgMarkup)

  return (
    <div
      className='image-renderer'
      // Sanitized immediately above with DOMPurify before injection.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: image markup is DOMPurify-sanitized before injection.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
