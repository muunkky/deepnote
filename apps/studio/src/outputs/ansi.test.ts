import { describe, expect, it } from 'vitest'
import { stripAnsi } from './ansi'

const ESC = String.fromCharCode(0x1b)

describe('stripAnsi', () => {
  it('strips SGR colour codes, leaving the text', () => {
    expect(stripAnsi(`${ESC}[0;31mValueError${ESC}[0m`)).toBe('ValueError')
  })

  it('strips a multi-parameter CSI sequence', () => {
    expect(stripAnsi(`${ESC}[1;32;40mok${ESC}[0m`)).toBe('ok')
  })

  it('leaves plain text untouched', () => {
    expect(stripAnsi('no escapes here')).toBe('no escapes here')
  })

  it('preserves newlines and surrounding whitespace', () => {
    expect(stripAnsi(`a\n${ESC}[31mb${ESC}[0m\nc`)).toBe('a\nb\nc')
  })
})
