import type { FC } from 'react'
import { coerceMultilineString } from './multiline'

// Raster image bundle renderer (`image/png`, `image/jpeg`). Jupyter persists the payload as
// base64 (a `MultilineString`); we render it as a data-URI `<img>`. The MIME type is bound
// per registry entry via `makeImageMime` so the registry contract stays `FC<{ data }>`
// (design Interface) while each `<img>` still gets the correct media type in its data URI.
//
// No sanitization step is needed: the bytes never become live markup — they are an opaque
// base64 string placed in an `<img src>` data URI, which the browser decodes as an image,
// not as a document. (HTML/SVG, which DO become live markup, are sanitized in their own
// renderers.)
export function makeImageMime(mime: string): FC<{ data: unknown }> {
  function ImageMimeRenderer({ data }: { data: unknown }) {
    const base64 = coerceMultilineString(data)
    if (base64 == null) return null
    // Strip incidental whitespace/newlines from the line-split base64 before the data URI.
    const compact = base64.replace(/\s+/g, '')
    return (
      <img
        className='output-mime output-mime--image'
        src={`data:${mime};base64,${compact}`}
        alt='cell output'
        decoding='async'
      />
    )
  }
  ImageMimeRenderer.displayName = `ImageMime(${mime})`
  return ImageMimeRenderer
}
