import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { DeepnoteBlock } from '../deepnote-file/deepnote-file-schema'
import {
  isExecutableBlock,
  isExecutableBlockType,
  isValueAddBlockType,
  VALUE_ADD_BLOCK_TYPES,
} from './executable-blocks'

describe('isExecutableBlock', () => {
  const executableTypes = [
    'agent',
    'code',
    'sql',
    'notebook-function',
    'visualization',
    'button',
    'big-number',
    'input-text',
    'input-textarea',
    'input-checkbox',
    'input-select',
    'input-slider',
    'input-date',
    'input-date-range',
    'input-file',
  ]

  for (const type of executableTypes) {
    it(`returns true for ${type} block`, () => {
      const block = { id: '1', type, blockGroup: 'g', sortingKey: 'a', metadata: {} } as DeepnoteBlock
      expect(isExecutableBlock(block)).toBe(true)
    })
  }

  const nonExecutableTypes = ['markdown', 'text-cell-h1', 'text-cell-p', 'text-cell-bullet', 'image', 'divider']

  for (const type of nonExecutableTypes) {
    it(`returns false for ${type} block`, () => {
      const block = { id: '1', type, blockGroup: 'g', sortingKey: 'a', metadata: {} } as DeepnoteBlock
      expect(isExecutableBlock(block)).toBe(false)
    })
  }
})

describe('isExecutableBlockType', () => {
  it('returns true for agent type', () => {
    expect(isExecutableBlockType('agent')).toBe(true)
  })

  it('returns true for code type', () => {
    expect(isExecutableBlockType('code')).toBe(true)
  })

  it('returns false for markdown type', () => {
    expect(isExecutableBlockType('markdown')).toBe(false)
  })

  it('returns false for unknown type', () => {
    expect(isExecutableBlockType('unknown')).toBe(false)
  })
})

describe('VALUE_ADD_BLOCK_TYPES', () => {
  // The full executable set, kept in lockstep with executable-blocks.ts.
  const executableTypes = [
    'agent',
    'code',
    'sql',
    'notebook-function',
    'visualization',
    'button',
    'big-number',
    'input-text',
    'input-textarea',
    'input-checkbox',
    'input-select',
    'input-slider',
    'input-date',
    'input-date-range',
    'input-file',
  ]

  it('equals the executable block types minus plain code', () => {
    const expected = new Set(executableTypes.filter(type => type !== 'code'))
    expect(VALUE_ADD_BLOCK_TYPES).toEqual(expected)
  })

  it('excludes plain code', () => {
    expect(VALUE_ADD_BLOCK_TYPES.has('code')).toBe(false)
    expect(isValueAddBlockType('code')).toBe(false)
  })

  it('includes every value-add executable type', () => {
    for (const type of executableTypes.filter(type => type !== 'code')) {
      expect(isValueAddBlockType(type)).toBe(true)
    }
  })

  it('returns false for non-executable and unknown types', () => {
    expect(isValueAddBlockType('markdown')).toBe(false)
    expect(isValueAddBlockType('text-cell-h1')).toBe(false)
    expect(isValueAddBlockType('unknown')).toBe(false)
  })

  // KD-4 drift guard: every block type the python-code.ts dispatcher emits
  // codegen for (i.e. every executable type except `code`) must be a member of
  // VALUE_ADD_BLOCK_TYPES, so a newly added value-add type fails this test
  // until it is classified. We resolve the dispatcher's coverage structurally
  // from source: the `is<Name>Block(block)` guards it calls, each of which is a
  // `block.type === '<literal>'` predicate.
  it('covers every type the python-code.ts dispatcher handles (except code)', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const dispatcherSrc = readFileSync(join(here, '..', 'python-code.ts'), 'utf8')

    // All `is<Name>Block(block)` guard calls in the dispatcher (deduped).
    const guardNames = new Set(
      Array.from(dispatcherSrc.matchAll(/\bis([A-Za-z]+)Block\(block\)/g), m => `is${m[1]}Block`)
    )
    expect(guardNames.size).toBeGreaterThan(0)

    // Resolve each guard to the `block.type === '<literal>'` it tests by
    // scanning the blocks source tree once.
    const guardSources = [
      'agent-blocks.ts',
      'big-number-blocks.ts',
      'button-blocks.ts',
      'code-blocks.ts',
      'input-blocks.ts',
      'notebook-function-blocks.ts',
      'sql-blocks.ts',
      'visualization-blocks.ts',
    ]
      .map(file => readFileSync(join(here, file), 'utf8'))
      .join('\n')

    const dispatchedTypes = new Set<string>()
    for (const guard of guardNames) {
      // Match: export function isSqlBlock(...) { return block.type === 'sql' }
      const re = new RegExp(`function ${guard}\\b[\\s\\S]*?block\\.type === '([a-z-]+)'`)
      const match = guardSources.match(re)
      expect(match, `could not resolve type literal for dispatcher guard ${guard}`).not.toBeNull()
      if (match) {
        dispatchedTypes.add(match[1])
      }
    }

    // The dispatcher must handle `code` (plain Python) and at least one
    // value-add type; sanity-check the structural extraction worked.
    expect(dispatchedTypes.has('code')).toBe(true)
    expect(dispatchedTypes.has('sql')).toBe(true)

    // Every dispatched type except `code` must be classified as value-add.
    for (const type of dispatchedTypes) {
      if (type === 'code') {
        continue
      }
      expect(isValueAddBlockType(type), `dispatcher handles '${type}' but it is not a VALUE_ADD_BLOCK_TYPE`).toBe(true)
    }
  })
})
