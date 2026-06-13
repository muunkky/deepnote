import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BlockVM } from '../shell/viewModels'
import { BLOCK_RENDERERS, BlockRenderer } from './BlockRenderer'
import { makeBlock } from './testBlocks'

// Step 7C additive-registration coverage. Kept in its own file (not appended to
// BlockRenderer.test.tsx) so the registry-dispatch assertions for the input/button/separator
// keys merge keep-both with the sibling 7A/7B/7D edits to the same registry. Asserts that the
// ten keys this card registers resolve to a concrete renderer through the PUBLIC `BlockRenderer`
// dispatch — real DOM, no mock — never falling through to the unknown fallback.

const INPUT_KINDS: Array<BlockVM['type']> = [
  'input-text',
  'input-textarea',
  'input-checkbox',
  'input-select',
  'input-slider',
  'input-date',
  'input-date-range',
  'input-file',
]

// Persisted-shape blocks the renderers can read without throwing. Each carries the metadata
// its kind requires (the discriminated union narrows on `type`).
function fixtureBlock(type: BlockVM['type']): BlockVM {
  const base: Record<string, unknown> = { deepnote_variable_name: 'v' }
  switch (type) {
    case 'input-checkbox':
      return makeBlock(type, type, '', { metadata: { ...base, deepnote_variable_value: true } })
    case 'input-select':
      return makeBlock(type, type, '', { metadata: { ...base, deepnote_variable_value: 'A' } })
    case 'input-slider':
      return makeBlock(type, type, '', {
        metadata: {
          ...base,
          deepnote_variable_value: '5',
          deepnote_slider_min_value: 0,
          deepnote_slider_max_value: 10,
        },
      })
    case 'input-date-range':
      return makeBlock(type, type, '', { metadata: { ...base, deepnote_variable_value: ['2026-01-01', '2026-02-01'] } })
    case 'button':
      return makeBlock(type, type, '', { metadata: { deepnote_button_title: 'Go' } })
    case 'separator':
      return makeBlock(type, type, '', { metadata: {} })
    default:
      return makeBlock(type, type, '', { metadata: { ...base, deepnote_variable_value: 'x' } })
  }
}

describe('BlockRenderer registry — step 7C input/button/separator keys', () => {
  it('registers all eight input kinds additively (each resolves to a renderer)', () => {
    for (const kind of INPUT_KINDS) {
      expect(BLOCK_RENDERERS[kind], `${kind} registered`).toBeDefined()
    }
  })

  it('registers button and separator additively', () => {
    expect(BLOCK_RENDERERS.button).toBeDefined()
    expect(BLOCK_RENDERERS.separator).toBeDefined()
  })

  it('the seven prior text-cell keys + code + markdown remain registered (keep-both seam intact)', () => {
    // Guard against a non-additive edit clobbering sibling keys.
    expect(BLOCK_RENDERERS.code).toBeDefined()
    expect(BLOCK_RENDERERS.markdown).toBeDefined()
    expect(BLOCK_RENDERERS['text-cell-callout']).toBeDefined()
    expect(BLOCK_RENDERERS.default).toBeDefined()
  })

  it('dispatches each input kind through BlockRenderer to a read-only display (not the fallback)', () => {
    for (const kind of INPUT_KINDS) {
      const { container, unmount } = render(<BlockRenderer block={fixtureBlock(kind)} />)
      // Routed to the input renderer, not the unknown fallback.
      expect(container.querySelector('[data-block-unknown="true"]'), `${kind} not fallback`).toBeNull()
      expect(container.querySelector(`[data-input-kind="${kind}"]`), `${kind} input shell`).not.toBeNull()
      unmount()
    }
  })

  it('dispatches button to a disabled, non-firing button via BlockRenderer', () => {
    const { container } = render(<BlockRenderer block={fixtureBlock('button')} />)
    expect(container.querySelector('[data-block-unknown="true"]')).toBeNull()
    const button = container.querySelector('button[data-button="true"]') as HTMLButtonElement | null
    expect(button).not.toBeNull()
    expect(button?.disabled).toBe(true)
    expect(button?.textContent).toContain('Go')
  })

  it('dispatches separator to an <hr> rule via BlockRenderer', () => {
    const { container } = render(<BlockRenderer block={fixtureBlock('separator')} />)
    expect(container.querySelector('[data-block-unknown="true"]')).toBeNull()
    expect(container.querySelector('hr[data-separator="true"]')).not.toBeNull()
  })
})
