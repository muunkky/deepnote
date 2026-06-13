import DOMPurify from 'dompurify'
import { coerceMultilineString } from './multiline'

// `image/svg+xml` bundle renderer. SVG is live markup — it can carry `<script>` and event
// handlers — so it is sanitized with DOMPurify (`USE_PROFILES: { svg: true }` so the SVG
// element vocabulary survives while scripts/handlers are stripped) before injection. This
// is the SVG arm of the same "sanitize HTML/SVG before injection" guarantee the card and
// design security note require. A non-string payload renders nothing.
export function SvgMime({ data }: { data: unknown }) {
  const svg = coerceMultilineString(data)
  if (svg == null) return null
  const safe = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
  return (
    <div
      className='output-mime output-mime--svg'
      // Sanitized immediately above with the SVG profile; injection renders the vector image.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is DOMPurify-sanitized before injection.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
