import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeRenderer } from './CodeRenderer'
import { makeBlock } from './testBlocks'

// CodeRenderer: syntax-highlighted source from `block.content`, persisted outputs (via the
// OutputRenderer that arrives in step 6 — stubbed here), and the READ-ONLY invariant (R8):
// no run control, no editable field.
describe('CodeRenderer', () => {
  it('renders the source text from block.content', () => {
    // highlight.js splits the source across token <span>s, so the literal text lives in the
    // <code> element's aggregate textContent rather than a single text node.
    const block = makeBlock('c1', 'code', 'x = 1 + 1')
    const { container } = render(<CodeRenderer block={block} />)
    expect(container.querySelector('code')?.textContent).toContain('x = 1 + 1')
  })

  it('applies syntax highlighting (hljs token spans)', () => {
    const block = makeBlock('c2', 'code', 'import pandas as pd')
    const { container } = render(<CodeRenderer block={block} />)
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    // highlight.js wraps recognised tokens in `.hljs-*` spans.
    expect(container.querySelector('[class*="hljs-"]')).not.toBeNull()
  })

  it('exposes NO run control (R8 read-only)', () => {
    const block = makeBlock('c3', 'code', 'print(1)')
    const { container } = render(<CodeRenderer block={block} />)
    expect(container.querySelector('button')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('exposes NO editable field (R8 read-only)', () => {
    const block = makeBlock('c4', 'code', 'print(1)')
    const { container } = render(<CodeRenderer block={block} />)
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('[contenteditable="true"]')).toBeNull()
  })

  it('renders persisted outputs through the output slot', () => {
    // Step 6 supplies the real OutputRenderer; until then CodeRenderer must still mount an
    // output region driven by `block.outputs ?? []` so the wiring is in place. A stream
    // output's text should reach the DOM.
    const block = makeBlock('c5', 'code', 'pass  # no echo', {
      outputs: [{ output_type: 'stream', name: 'stdout', text: 'streamed-output-line\n' }],
    })
    const { container } = render(<CodeRenderer block={block} />)
    const slot = container.querySelector('.output-slot')
    expect(slot).not.toBeNull()
    expect(slot?.textContent).toContain('streamed-output-line')
  })

  it('renders with no outputs without throwing', () => {
    const block = makeBlock('c6', 'code', 'pass')
    expect(() => render(<CodeRenderer block={block} />)).not.toThrow()
  })
})
