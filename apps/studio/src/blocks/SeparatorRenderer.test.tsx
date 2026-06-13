import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BlockVM } from '../shell/viewModels'
import { SeparatorRenderer } from './SeparatorRenderer'
import { makeBlock } from './testBlocks'

// Read-only `separator` renderer (design Phase 8a, R8). A separator is a pure visual divider;
// its persisted markdown form (`@deepnote/blocks` `createMarkdownForSeparatorBlock`) is
// `'<hr>'`, so the viewer's read-only equivalent is exactly an `<hr>` element.

function separatorBlock(): BlockVM {
  return makeBlock('sep', 'separator', '', { metadata: {} })
}

describe('SeparatorRenderer', () => {
  // ── Capstone (separator) ──────────────────────────────────────────────────────────────
  it('CAPSTONE: renders a divider <hr> rule element in real DOM', () => {
    const { container } = render(<SeparatorRenderer block={separatorBlock()} />)
    const hr = container.querySelector('hr')
    expect(hr).not.toBeNull()
    expect(hr?.tagName).toBe('HR')
    expect(hr?.getAttribute('data-separator')).toBe('true')
  })
})
