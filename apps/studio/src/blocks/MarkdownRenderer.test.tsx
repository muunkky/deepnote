import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownRenderer } from './MarkdownRenderer'
import { makeBlock } from './testBlocks'

// MarkdownRenderer: a `markdown` block's content rendered as formatted prose.
describe('MarkdownRenderer', () => {
  it('renders a heading as an <h2> element', () => {
    const block = makeBlock('m1', 'markdown', '## Setup')
    const { container } = render(<MarkdownRenderer block={block} />)
    const h2 = container.querySelector('h2')
    expect(h2).not.toBeNull()
    expect(h2?.textContent).toContain('Setup')
  })

  it('renders inline emphasis as <strong>', () => {
    const block = makeBlock('m2', 'markdown', 'a **bold** word')
    const { container } = render(<MarkdownRenderer block={block} />)
    expect(container.querySelector('strong')?.textContent).toBe('bold')
  })

  it('renders list items as <li>', () => {
    const block = makeBlock('m3', 'markdown', '- one\n- two')
    const { container } = render(<MarkdownRenderer block={block} />)
    expect(container.querySelectorAll('li').length).toBe(2)
  })

  it('sanitizes a <script> tag in persisted markdown (no injection)', () => {
    const block = makeBlock('m4', 'markdown', 'safe\n\n<script>window.__pwned = true</script>')
    const { container } = render(<MarkdownRenderer block={block} />)
    expect(container.querySelector('script')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('renders empty content without throwing', () => {
    const block = makeBlock('m5', 'markdown', '')
    expect(() => render(<MarkdownRenderer block={block} />)).not.toThrow()
  })

  it('exposes no editable field (read-only)', () => {
    const block = makeBlock('m6', 'markdown', 'hello')
    const { container } = render(<MarkdownRenderer block={block} />)
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelector('[contenteditable="true"]')).toBeNull()
    expect(screen.queryByText('hello')).toBeTruthy()
  })
})
