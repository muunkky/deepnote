import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_KERNEL_NAME, isNonPythonKernel, selectKernelName } from './kernel-name'

describe('selectKernelName', () => {
  const originalDeepnotePython = process.env.DEEPNOTE_PYTHON

  afterEach(() => {
    if (originalDeepnotePython === undefined) {
      delete process.env.DEEPNOTE_PYTHON
    } else {
      process.env.DEEPNOTE_PYTHON = originalDeepnotePython
    }
  })

  it('returns the explicit kernel name when provided', () => {
    expect(selectKernelName({ explicit: 'foo' })).toBe('foo')
  })

  it('falls back to the python3 default when nothing is provided', () => {
    expect(selectKernelName({})).toBe('python3')
    expect(selectKernelName({})).toBe(DEFAULT_KERNEL_NAME)
  })

  it('treats a whitespace-only explicit value as absent', () => {
    expect(selectKernelName({ explicit: '   ' })).toBe('python3')
    expect(selectKernelName({ explicit: '' })).toBe('python3')
  })

  it('trims a present explicit value', () => {
    expect(selectKernelName({ explicit: '  bash  ' })).toBe('bash')
  })

  it('uses the declared tier when no explicit value is present', () => {
    expect(selectKernelName({ declared: 'julia' })).toBe('julia')
  })

  it('prefers explicit over declared (flag beats declared)', () => {
    expect(selectKernelName({ explicit: 'bash', declared: 'julia' })).toBe('bash')
  })

  it('falls through a whitespace-only declared value to the default', () => {
    expect(selectKernelName({ declared: '  ' })).toBe('python3')
  })

  it('does not read DEEPNOTE_PYTHON (pure selector, no env read)', () => {
    process.env.DEEPNOTE_PYTHON = '/some/python/path'
    expect(selectKernelName({})).toBe('python3')
    expect(selectKernelName({ explicit: 'bash' })).toBe('bash')
  })
})

describe('isNonPythonKernel', () => {
  it('returns false for the python3 default (name fast-path)', () => {
    expect(isNonPythonKernel('python3')).toBe(false)
  })

  it('returns true for a non-python3 name with no language hint', () => {
    expect(isNonPythonKernel('bash')).toBe(true)
  })

  it('honors a python language refinement over a non-python3 name', () => {
    // e.g. xeus-python registers under a non-`python3` kernelspec name but is Python.
    expect(isNonPythonKernel('xeus', 'python')).toBe(false)
  })

  it('treats the language refinement case-insensitively', () => {
    expect(isNonPythonKernel('xeus', 'Python')).toBe(false)
  })

  it('returns true when a non-python3 name carries a non-python language', () => {
    expect(isNonPythonKernel('bash', 'bash')).toBe(true)
  })

  it('keeps the python3 fast-path even when a language is supplied', () => {
    expect(isNonPythonKernel('python3', 'python')).toBe(false)
  })
})
