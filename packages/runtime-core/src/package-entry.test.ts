// Capstone: import from the PACKAGE ENTRY (not the relative ./python-env file).
// This is the integration-meaningful contract step 3A (MCP) and step 3B (CLI) consume — if
// either symbol is not re-exported from index.ts, this import fails to type-check
// and the assertions below cannot run.
import { isBareSystemPython, selectPythonSpec } from '@deepnote/runtime-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('@deepnote/runtime-core package entry', () => {
  let savedDeepnotePython: string | undefined

  beforeEach(() => {
    savedDeepnotePython = process.env.DEEPNOTE_PYTHON
    delete process.env.DEEPNOTE_PYTHON
  })

  afterEach(() => {
    if (savedDeepnotePython === undefined) {
      delete process.env.DEEPNOTE_PYTHON
    } else {
      process.env.DEEPNOTE_PYTHON = savedDeepnotePython
    }
  })

  it('re-exports selectPythonSpec and isBareSystemPython as callables', () => {
    expect(typeof selectPythonSpec).toBe('function')
    expect(typeof isBareSystemPython).toBe('function')
  })

  it('selectPythonSpec from the package entry applies arg > DEEPNOTE_PYTHON precedence', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    // Explicit arg wins over the env var.
    expect(selectPythonSpec({ explicit: '/explicit/venv/bin/python' })).toBe('/explicit/venv/bin/python')

    // Falls through to the env var when no explicit arg is supplied.
    expect(selectPythonSpec({})).toBe('/env/venv/bin/python')
  })

  it('isBareSystemPython from the package entry classifies bare vs path specs', () => {
    expect(isBareSystemPython('python')).toBe(true)
    expect(isBareSystemPython('python3')).toBe(true)
    expect(isBareSystemPython('python3.11')).toBe(true)
    expect(isBareSystemPython('/usr/local/venv/bin/python')).toBe(false)
  })
})
