// A Jupyter `IMimeBundle` text value is `MultilineString` — `string | string[]`, where the
// array form is line-split content that must be `join('')`ed (NOT `join('\n')`: the lines
// already carry their own trailing newlines). The terminal renderer does exactly this
// (`Array.isArray(...) ? x.join('') : x`); the browser renderers reuse this one helper so
// the coercion is defined once. Non-string payloads (JSON bundles) return `undefined` so a
// renderer can detect "this is not text I can show".
export function coerceMultilineString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every(part => typeof part === 'string')) {
    return value.join('')
  }
  return undefined
}
