import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextRenderer } from './TextRenderer'
import { makeBlock } from './testBlocks'

// TextRenderer: the seven `text-cell-*` kinds. It reuses `createMarkdownForTextBlock` from
// `@deepnote/blocks` to derive markdown, then renders it — so each kind produces its
// correct semantic DOM structure (the design's per-kind structure assertion).
describe('TextRenderer', () => {
  it('renders text-cell-p as a paragraph', () => {
    const { container } = render(<TextRenderer block={makeBlock('p', 'text-cell-p', 'A paragraph.')} />)
    expect(container.querySelector('p')?.textContent).toContain('A paragraph.')
  })

  it('renders text-cell-h1 as an <h1>', () => {
    const { container } = render(<TextRenderer block={makeBlock('h1', 'text-cell-h1', 'Title one')} />)
    expect(container.querySelector('h1')?.textContent).toContain('Title one')
  })

  it('renders text-cell-h2 as an <h2>', () => {
    const { container } = render(<TextRenderer block={makeBlock('h2', 'text-cell-h2', 'Title two')} />)
    expect(container.querySelector('h2')?.textContent).toContain('Title two')
  })

  it('renders text-cell-h3 as an <h3>', () => {
    const { container } = render(<TextRenderer block={makeBlock('h3', 'text-cell-h3', 'Title three')} />)
    expect(container.querySelector('h3')?.textContent).toContain('Title three')
  })

  it('renders text-cell-bullet as a list item', () => {
    const { container } = render(<TextRenderer block={makeBlock('b', 'text-cell-bullet', 'A bullet')} />)
    expect(container.querySelector('li')?.textContent).toContain('A bullet')
  })

  it('renders text-cell-todo as a task list item with a checkbox', () => {
    const { container } = render(<TextRenderer block={makeBlock('t', 'text-cell-todo', 'Do this')} />)
    const li = container.querySelector('li')
    expect(li?.textContent).toContain('Do this')
    // GitHub-style task list: a (disabled) checkbox input inside the list item.
    expect(li?.querySelector('input[type="checkbox"]')).not.toBeNull()
  })

  it('renders a checked text-cell-todo as a checked checkbox', () => {
    const block = makeBlock('t2', 'text-cell-todo', 'Done thing', { metadata: { checked: true } })
    const { container } = render(<TextRenderer block={block} />)
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(checkbox?.checked).toBe(true)
  })

  it('renders text-cell-callout as a blockquote', () => {
    const { container } = render(<TextRenderer block={makeBlock('cl', 'text-cell-callout', 'Heads up')} />)
    expect(container.querySelector('blockquote')?.textContent).toContain('Heads up')
  })

  it('to-do checkbox is disabled (read-only)', () => {
    const { container } = render(<TextRenderer block={makeBlock('t3', 'text-cell-todo', 'Locked')} />)
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(checkbox?.disabled).toBe(true)
  })

  it('escapes markdown-significant characters in content (no injection)', () => {
    // `createMarkdownForTextBlock` escapes content; a `<script>` in the source must not
    // survive as an executable element after render+sanitize.
    const block = makeBlock('x', 'text-cell-p', '<script>window.__pwned = true</script>')
    const { container } = render(<TextRenderer block={block} />)
    expect(container.querySelector('script')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })
})
