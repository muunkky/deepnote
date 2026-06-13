import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { displayData } from './__fixtures__/outputs'
import { DataRenderer } from './DataRenderer'

// DataRenderer: the display_data/execute_result arm — picks the richest MIME via the
// registry. The OutputRenderer suite covers HTML/image/svg precedence + sanitization; this
// suite covers the remaining registry arms (markdown, text/plain ANSI) and the
// no-renderable-MIME fallback.
describe('DataRenderer (MIME arms + fallback)', () => {
  it('renders text/markdown through the shared markdown+sanitize seam', () => {
    const { container } = render(<DataRenderer output={displayData({ 'text/markdown': '## Result\n\n- a\n- b' })} />)
    expect(container.querySelector('h2')?.textContent).toContain('Result')
    expect(container.querySelectorAll('li').length).toBe(2)
  })

  it('renders text/plain as preformatted, ANSI-stripped text (last resort)', () => {
    const esc = String.fromCharCode(0x1b)
    const { container } = render(<DataRenderer output={displayData({ 'text/plain': `${esc}[32mok${esc}[0m value` })} />)
    const pre = container.querySelector('pre.output-mime--text')
    expect(pre).not.toBeNull()
    expect(pre?.textContent).toBe('ok value')
    expect(pre?.textContent).not.toContain(esc)
  })

  it('joins a line-split MultilineString text/plain payload with no inserted separators', () => {
    const { container } = render(<DataRenderer output={displayData({ 'text/plain': ['line1\n', 'line2\n'] })} />)
    expect(container.querySelector('pre')?.textContent).toBe('line1\nline2\n')
  })

  it('emits a typed marker (not blank) when no MIME type is renderable', () => {
    const { container } = render(<DataRenderer output={displayData({ 'application/x-custom': 'blob' })} />)
    const marker = container.querySelector('[data-output-unrenderable="true"]')
    expect(marker).not.toBeNull()
    expect(marker?.textContent).toContain('application/x-custom')
  })
})
