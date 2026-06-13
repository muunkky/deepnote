import { describe, expect, it } from 'vitest'
import { MIME_PRECEDENCE, MIME_REGISTRY, pickRenderer } from './registry'

// The rich-first MIME registry — the precedence inversion of the terminal renderer.
describe('MIME registry (rich-first precedence)', () => {
  it('prefers text/html over text/plain (rich-first, inverting the terminal)', () => {
    const picked = pickRenderer({ 'text/plain': 'fallback', 'text/html': '<b>rich</b>' })
    expect(picked?.mime).toBe('text/html')
  })

  it('prefers an image over text/plain', () => {
    const picked = pickRenderer({ 'text/plain': '<Figure>', 'image/png': 'AAAA' })
    expect(picked?.mime).toBe('image/png')
  })

  it('falls back to text/plain when it is the only renderable MIME type (last resort)', () => {
    const picked = pickRenderer({ 'text/plain': 'just text' })
    expect(picked?.mime).toBe('text/plain')
  })

  it('orders the full precedence list richest-first with text/plain last', () => {
    expect(MIME_PRECEDENCE[0]).toBe('text/html')
    expect(MIME_PRECEDENCE[MIME_PRECEDENCE.length - 1]).toBe('text/plain')
    // text/plain must come AFTER every rich MIME type (the inversion invariant).
    const plainIndex = MIME_PRECEDENCE.indexOf('text/plain')
    for (const rich of ['text/html', 'image/png', 'image/jpeg', 'image/svg+xml', 'text/markdown']) {
      expect(MIME_PRECEDENCE.indexOf(rich)).toBeLessThan(plainIndex)
    }
  })

  it('returns undefined for a bundle with no renderable MIME type', () => {
    expect(pickRenderer({ 'application/x-unknown': 'blob' })).toBeUndefined()
  })

  it('ignores a present-but-null MIME value', () => {
    const picked = pickRenderer({ 'text/html': null as unknown as string, 'text/plain': 'text' })
    expect(picked?.mime).toBe('text/plain')
  })

  it('registers a renderer for every MIME type in the precedence list', () => {
    for (const mime of MIME_PRECEDENCE) {
      expect(MIME_REGISTRY[mime], `missing renderer for ${mime}`).toBeTypeOf('function')
    }
  })
})
