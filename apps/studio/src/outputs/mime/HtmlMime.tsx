import DOMPurify from 'dompurify'
import { coerceMultilineString } from './multiline'

// `text/html` bundle renderer — pandas dataframe tables, rich reprs, etc. Persisted HTML
// is UNTRUSTED (a notebook could carry a `<script>`/`onerror` payload), so it is sanitized
// with DOMPurify before it reaches React's `dangerouslySetInnerHTML` — the same DOMPurify
// seam the markdown renderer funnels through (design security note, Decision 2 /
// "DOMPurify-class"). On the localhost trust boundary an unsanitized injection is still a
// latent XSS/DOM-corruption defect, not a risk we accept silently.
export function HtmlMime({ data }: { data: unknown }) {
  const html = coerceMultilineString(data)
  if (html == null) return null
  const safe = DOMPurify.sanitize(html)
  return (
    <div
      className='output-mime output-mime--html'
      // Sanitized immediately above; injection is required to render dataframe tables as DOM.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is DOMPurify-sanitized before injection.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
