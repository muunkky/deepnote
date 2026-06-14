import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  displayData,
  errorOutput,
  executeResult,
  MALICIOUS_HTML,
  MALICIOUS_SVG,
  PNG_1X1_BASE64,
  streamOutput,
  unrecognizedOutput,
} from './__fixtures__/outputs'
import { OutputRenderer } from './OutputRenderer'

declare global {
  interface Window {
    __pwned_html?: boolean
    __pwned_svg?: boolean
  }
}

afterEach(() => {
  window.__pwned_html = undefined
  window.__pwned_svg = undefined
})

describe('OutputRenderer dispatch', () => {
  it('renders a stream output with absent/nullish text as empty without crashing (regression: stripAnsi on undefined)', () => {
    // A malformed/older persisted stream output can omit `text` (typed string|string[] but
    // untrusted at runtime). stripAnsi previously received `undefined` → TypeError → blanked
    // the view. It must coerce to '' and render an empty stream pre.
    const malformed = { output_type: 'stream', name: 'stdout' } as ReturnType<typeof streamOutput>
    expect(() => render(<OutputRenderer outputs={[malformed]} />)).not.toThrow()
    const { container } = render(<OutputRenderer outputs={[malformed]} />)
    expect(container.querySelector('.output-stream')?.textContent).toBe('')
  })

  it('renders a stream output (stdout) as DOM text', () => {
    const { container } = render(<OutputRenderer outputs={[streamOutput('stdout', 'hello stdout\n')]} />)
    expect(container.querySelector('.output-stream')?.textContent).toContain('hello stdout')
  })

  it('styles a stderr stream distinctly from stdout', () => {
    const { container } = render(<OutputRenderer outputs={[streamOutput('stderr', 'a warning\n')]} />)
    const el = container.querySelector('[data-stream="stderr"]')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('output-stream--stderr')
  })

  it('renders an error output: ename/evalue header AND ANSI-stripped traceback (not blank)', () => {
    const esc = String.fromCharCode(0x1b)
    const out = errorOutput('ValueError', 'bad value', [
      `${esc}[0;31m---------${esc}[0m`,
      'Traceback (most recent call last)',
      `${esc}[0;31mValueError${esc}[0m: bad value`,
    ])
    const { container } = render(<OutputRenderer outputs={[out]} />)
    const err = container.querySelector('[data-output-error="true"]')
    expect(err).not.toBeNull()
    expect(err?.textContent).toContain('ValueError')
    expect(err?.textContent).toContain('bad value')
    // The traceback text survives; ANSI escape sequences are stripped.
    expect(err?.textContent).toContain('Traceback (most recent call last)')
    expect(err?.textContent).not.toContain(esc)
    expect(err?.textContent).not.toContain('[0;31m')
  })

  it('renders display_data via the MIME registry (rich HTML)', () => {
    const out = displayData({ 'text/plain': 'plain repr', 'text/html': '<table><tr><td>cell</td></tr></table>' })
    const { container } = render(<OutputRenderer outputs={[out]} />)
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelector('[data-output-mime="text/html"]')).not.toBeNull()
  })

  it('renders execute_result, preferring image over text/plain', () => {
    const out = executeResult({ 'text/plain': '<Figure>', 'image/png': PNG_1X1_BASE64 })
    const { container } = render(<OutputRenderer outputs={[out]} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('data:image/png;base64,')
  })

  // ── Strengthened capstone ────────────────────────────────────────────────
  // Every output type renders real content through the REAL OutputRenderer, and the step-5
  // `data-output-pending` placeholder is fully replaced for ALL types (not just stream).
  it('CAPSTONE: all four output types render real content; no data-output-pending remains', () => {
    const outputs = [
      streamOutput('stdout', 'printed line\n'),
      errorOutput('RuntimeError', 'boom', ['RuntimeError: boom']),
      displayData({ 'text/plain': 'plain', 'text/html': '<div class="rich">rich</div>' }),
      executeResult({ 'image/png': PNG_1X1_BASE64 }),
    ]
    const { container } = render(<OutputRenderer outputs={outputs} />)

    // The placeholder seam is gone for EVERY output type — the specific L1 gap closed.
    expect(container.querySelector('[data-output-pending]')).toBeNull()

    // stream
    expect(container.querySelector('.output-stream')?.textContent).toContain('printed line')
    // error (the specific non-stream type that previously rendered blank)
    const err = container.querySelector('[data-output-error="true"]')
    expect(err?.textContent).toContain('RuntimeError')
    expect(err?.textContent).toContain('boom')
    // display_data — richest (HTML) wins, not text/plain
    expect(container.querySelector('.rich')?.textContent).toBe('rich')
    expect(container.textContent).not.toContain('plain')
    // execute_result — image renders
    expect(container.querySelector('img')?.getAttribute('src')).toContain('data:image/png;base64,')
  })

  it('CAPSTONE: a non-stream error output alone renders its content (never blank)', () => {
    const { container } = render(
      <OutputRenderer outputs={[errorOutput('KeyError', "'missing'", ["KeyError: 'missing'"])]} />
    )
    expect(container.querySelector('[data-output-pending]')).toBeNull()
    const err = container.querySelector('[data-output-error="true"]')
    expect(err).not.toBeNull()
    expect(err?.textContent?.trim().length).toBeGreaterThan(0)
    expect(err?.textContent).toContain('KeyError')
  })

  it('sanitizes a malicious text/html payload (no script execution)', () => {
    const out = displayData({ 'text/html': MALICIOUS_HTML })
    const { container } = render(<OutputRenderer outputs={[out]} />)
    expect(container.querySelector('script')).toBeNull()
    expect(window.__pwned_html).toBeUndefined()
    // the benign table content still renders
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('sanitizes a malicious image/svg+xml payload (no script execution)', () => {
    const out = displayData({ 'image/svg+xml': MALICIOUS_SVG })
    const { container } = render(<OutputRenderer outputs={[out]} />)
    expect(container.querySelector('script')).toBeNull()
    expect(window.__pwned_svg).toBeUndefined()
    // the benign vector content still renders
    expect(container.querySelector('svg')).not.toBeNull()
  })

  // ── Parity-of-shape ──────────────────────────────────────────────────────
  it('dispatches exactly the four output_types renderOutput handles (no fifth path)', () => {
    // An update_display_data output is outside the contract: it renders nothing (parity with
    // the terminal, which also no-ops), and crucially is NOT mis-routed to a data/stream/error
    // renderer.
    const { container } = render(<OutputRenderer outputs={[unrecognizedOutput()]} />)
    expect(container.querySelector('.output-stream')).toBeNull()
    expect(container.querySelector('[data-output-error]')).toBeNull()
    expect(container.querySelector('[data-output-mime]')).toBeNull()
    expect(container.querySelector('[data-output-unrenderable]')).toBeNull()
  })

  it('renders nothing for an empty outputs array', () => {
    const { container } = render(<OutputRenderer outputs={[]} />)
    expect(container.querySelector('.output-renderer')).toBeNull()
  })
})
