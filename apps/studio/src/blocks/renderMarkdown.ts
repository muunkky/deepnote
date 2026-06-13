import DOMPurify from 'dompurify'
import { marked } from 'marked'

// The single markdown→HTML seam, shared by the markdown and text renderers (design Phase
// 4). Two responsibilities, in order:
//
//   1. Parse markdown to HTML with `marked` (synchronous — `async: false`, no extensions
//      that defer, so the return is a `string`, never a `Promise`).
//   2. **Sanitize** the result with DOMPurify before it is handed to React's
//      `dangerouslySetInnerHTML` (design security note, Decision 2 / "DOMPurify-class").
//      Persisted markdown can embed raw HTML; even on the localhost trust boundary,
//      injecting an unsanitized `<script>`/`onerror`/`javascript:` payload is a latent
//      XSS/DOM-corruption defect, not a risk we accept silently. Sanitizing here — at the
//      one seam every prose renderer funnels through — keeps the guarantee centralized
//      rather than re-derived per renderer.
//
// `marked` is configured once at module load. `gfm` enables GitHub-flavoured markdown
// (task lists for to-do cells, tables); `breaks` keeps single newlines as `<br>` so
// authored line breaks survive into prose.
marked.setOptions({ gfm: true, breaks: true, async: false })

export function renderMarkdownToSafeHtml(markdown: string): string {
  if (!markdown) return ''
  // `async: false` above guarantees a synchronous string return.
  const rawHtml = marked.parse(markdown) as string
  return DOMPurify.sanitize(rawHtml)
}
