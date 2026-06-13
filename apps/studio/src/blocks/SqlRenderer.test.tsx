import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SqlRenderer } from './SqlRenderer'
import { makeBlock } from './testBlocks'

// SqlRenderer (design Phase 6): a persisted `sql` block renders read-only — its SQL query
// (syntax-highlighted from `block.content`) and its persisted result table (routed through the
// OutputRenderer / MIME registry; a SQL result is typically a persisted HTML-table output).
// Read-only invariant (R8): no run control, no editable query.
describe('SqlRenderer', () => {
  it('renders the SQL query text from block.content', () => {
    // highlight.js splits the source across token <span>s, so the literal text lives in the
    // <code> element's aggregate textContent rather than a single text node.
    const block = makeBlock('s1', 'sql', 'SELECT * FROM users')
    const { container } = render(<SqlRenderer block={block} />)
    expect(container.querySelector('code')?.textContent).toContain('SELECT * FROM users')
  })

  it('applies syntax highlighting (hljs token spans)', () => {
    const block = makeBlock('s2', 'sql', 'SELECT id FROM orders WHERE total > 100')
    const { container } = render(<SqlRenderer block={block} />)
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    // highlight.js wraps recognised tokens (SQL keywords) in `.hljs-*` spans.
    expect(container.querySelector('[class*="hljs-"]')).not.toBeNull()
  })

  it('renders the persisted result table through the OutputRenderer (MIME registry)', () => {
    // A SQL result is typically a persisted HTML-table output; it must flow through the
    // OutputRenderer / MIME registry and reach the DOM as a real <table>.
    const block = makeBlock('s3', 'sql', 'SELECT * FROM users', {
      outputs: [
        {
          output_type: 'execute_result',
          data: {
            'text/html': '<table><thead><tr><th>id</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
            'text/plain': 'id\n1',
          },
          metadata: {},
        },
      ],
    })
    const { container } = render(<SqlRenderer block={block} />)
    const region = container.querySelector('.output-renderer')
    expect(region).not.toBeNull()
    // Rich-first MIME precedence renders the HTML table over text/plain.
    expect(container.querySelector('table')).not.toBeNull()
    expect(region?.textContent).toContain('id')
  })

  it('renders the query alone when there is no persisted output (no crash, no empty table)', () => {
    const block = makeBlock('s4', 'sql', 'SELECT 1')
    const { container } = render(<SqlRenderer block={block} />)
    expect(container.querySelector('code')?.textContent).toContain('SELECT 1')
    expect(container.querySelector('.output-renderer')).toBeNull()
    expect(container.querySelector('table')).toBeNull()
  })

  it('renders with no outputs without throwing', () => {
    const block = makeBlock('s5', 'sql', 'SELECT 1')
    expect(() => render(<SqlRenderer block={block} />)).not.toThrow()
  })

  it('exposes NO run control (R8 read-only)', () => {
    const block = makeBlock('s6', 'sql', 'SELECT 1')
    const { container } = render(<SqlRenderer block={block} />)
    expect(container.querySelector('button')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('exposes NO editable query field (R8 read-only)', () => {
    const block = makeBlock('s7', 'sql', 'SELECT 1')
    const { container } = render(<SqlRenderer block={block} />)
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('[contenteditable="true"]')).toBeNull()
  })
})
