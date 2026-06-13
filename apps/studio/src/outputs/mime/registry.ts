import type { FC } from 'react'
import { HtmlMime } from './HtmlMime'
import { makeImageMime } from './ImageMime'
import { MarkdownMime } from './MarkdownMime'
import { SvgMime } from './SvgMime'
import { TextMime } from './TextMime'

// The rendermime-style MIME dispatch (design Phase 5 / Interface ~352–388). This is the
// browser counterpart to the terminal `output-renderer.ts`'s `renderDataOutput`, with the
// precedence INVERTED: the terminal prefers `text/plain` (its richest renderable form);
// the browser is a real DOM and prefers the RICHEST representation — HTML/image/svg over
// `text/plain`, which is the last resort. First MIME in `MIME_PRECEDENCE` that the bundle
// carries (and that has a registered renderer) wins.
//
// `data` is typed `unknown` at the renderer boundary (design Key Implementation Decision):
// a Jupyter `IMimeBundle` value is `string | string[]` for text/image MIME types, but
// JSON-bundle MIME types (vega/plotly) would carry a parsed object — so each renderer
// narrows its own `data` internally rather than the registry asserting one shape.
export type MimeRenderer = FC<{ data: unknown }>

// Rich-first. The order is the precedence: earlier = richer = preferred.
export const MIME_PRECEDENCE: readonly string[] = [
  'text/html', // dataframe tables etc. (sanitized) — string | string[]
  'image/png',
  'image/jpeg', // base64 string | string[]
  'image/svg+xml', // svg markup (sanitized) — string | string[]
  'text/markdown', // rendered through the shared markdown+sanitize seam
  'text/plain', // last resort (ANSI-stripped) — mirrors the terminal fallback
]

export const MIME_REGISTRY: Record<string, MimeRenderer> = {
  'text/html': HtmlMime,
  'image/png': makeImageMime('image/png'),
  'image/jpeg': makeImageMime('image/jpeg'),
  'image/svg+xml': SvgMime,
  'text/markdown': MarkdownMime,
  'text/plain': TextMime,
}

/**
 * Pick the richest renderable representation from a Jupyter data bundle.
 *
 * Walks `MIME_PRECEDENCE` (rich → plain) and returns the first MIME type that is both
 * present in `data` and has a registered renderer. Returns `undefined` when the bundle
 * carries no MIME type this viewer can render (the caller falls back to a typed marker
 * rather than dropping the output silently — parity with the terminal's
 * "[Output with MIME types: …]" fallback).
 */
export function pickRenderer(data: Record<string, unknown>): { mime: string; render: MimeRenderer } | undefined {
  for (const mime of MIME_PRECEDENCE) {
    if (mime in data && data[mime] != null && MIME_REGISTRY[mime]) {
      return { mime, render: MIME_REGISTRY[mime] }
    }
  }
  return undefined
}
