import { describe, expect, it } from 'vitest'
import { formatNotebookHash, parseNotebookHash } from './hashRoute'

describe('parseNotebookHash', () => {
  it('extracts the id from a #/notebook/<id> hash', () => {
    expect(parseNotebookHash('#/notebook/nb-42')).toBe('nb-42')
  })

  it('decodes a percent-encoded id', () => {
    expect(parseNotebookHash('#/notebook/a%2Fb')).toBe('a/b')
  })

  it('returns undefined for an empty or non-matching hash', () => {
    expect(parseNotebookHash('')).toBeUndefined()
    expect(parseNotebookHash('#')).toBeUndefined()
    expect(parseNotebookHash('#/other/x')).toBeUndefined()
    expect(parseNotebookHash('#/notebook/')).toBeUndefined()
  })

  it('does not throw on a malformed percent-encoded hash (regression: URIError blanked the viewer)', () => {
    // A hand-edited URL like `#/notebook/%` makes decodeURIComponent throw URIError; since this
    // runs in the shell render path, an uncaught throw blanked the whole viewer. It must instead
    // fall back to the raw slice (a route that matches no notebook → default notebook).
    expect(() => parseNotebookHash('#/notebook/%')).not.toThrow()
    expect(parseNotebookHash('#/notebook/%')).toBe('%')
    expect(() => parseNotebookHash('#/notebook/%E0%A4')).not.toThrow()
  })
})

describe('formatNotebookHash', () => {
  it('round-trips through parseNotebookHash', () => {
    for (const id of ['nb-1', 'a/b', 'weird id']) {
      expect(parseNotebookHash(formatNotebookHash(id))).toBe(id)
    }
  })
})
