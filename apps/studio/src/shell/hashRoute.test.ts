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
})

describe('formatNotebookHash', () => {
  it('round-trips through parseNotebookHash', () => {
    for (const id of ['nb-1', 'a/b', 'weird id']) {
      expect(parseNotebookHash(formatNotebookHash(id))).toBe(id)
    }
  })
})
