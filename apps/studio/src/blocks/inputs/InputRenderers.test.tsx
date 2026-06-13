import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BlockVM } from '../../shell/viewModels'
import { makeBlock } from '../testBlocks'
import { InputCheckboxRenderer } from './InputCheckboxRenderer'
import { InputDateRangeRenderer } from './InputDateRangeRenderer'
import { InputDateRenderer } from './InputDateRenderer'
import { InputFileRenderer } from './InputFileRenderer'
import { InputSelectRenderer } from './InputSelectRenderer'
import { InputSliderRenderer } from './InputSliderRenderer'
import { InputTextareaRenderer } from './InputTextareaRenderer'
import { InputTextRenderer } from './InputTextRenderer'

// Read-only input renderers (design Phase 8a, R8). Each of the eight input kinds renders its
// persisted label + current `deepnote_variable_value` as an inert display. The load-bearing
// invariant under test is read-only: no kind exposes a control that could MUTATE state —
// no enabled text/select/range/file/date <input>, no <select>, no <textarea>. The checkbox
// and slider DO surface native elements (`<input type=checkbox>`, `<progress>`) but only as
// disabled/non-interactive reflections of persisted state, asserted explicitly below.

// Build an input block with metadata, narrowed to BlockVM. `makeBlock`'s `extra` overrides
// the factory's empty `metadata`, so the persisted shape each renderer reads is exactly here.
function inputBlock(id: string, type: BlockVM['type'], metadata: Record<string, unknown>): BlockVM {
  return makeBlock(id, type, '', {
    metadata: { deepnote_variable_name: 'my_var', ...metadata },
  })
}

// No control that could mutate state. The read-only affordances the design DOES allow are a
// disabled checkbox and a <progress> bar; anything else in this list would be a live control.
function assertNoMutatingControl(container: HTMLElement): void {
  expect(container.querySelector('select')).toBeNull()
  expect(container.querySelector('textarea')).toBeNull()
  // Any text-like / range / file / date <input> would be a mutating control. The only <input>
  // allowed is a disabled checkbox (asserted separately in its own test).
  const inputs = Array.from(container.querySelectorAll('input'))
  for (const input of inputs) {
    expect(input.type).toBe('checkbox')
    expect(input.disabled).toBe(true)
  }
}

describe('read-only input renderers', () => {
  it('input-text renders its persisted value + label, no mutating control', () => {
    const block = inputBlock('t', 'input-text', {
      deepnote_input_label: 'Your name',
      deepnote_variable_value: 'Ada Lovelace',
    })
    const { container } = render(<InputTextRenderer block={block} />)
    expect(container.textContent).toContain('Ada Lovelace')
    expect(container.textContent).toContain('Your name')
    assertNoMutatingControl(container)
  })

  it('input-textarea renders its persisted multi-line value, no mutating control', () => {
    const block = inputBlock('ta', 'input-textarea', {
      deepnote_variable_value: 'line one\nline two',
    })
    const { container } = render(<InputTextareaRenderer block={block} />)
    expect(container.textContent).toContain('line one')
    expect(container.textContent).toContain('line two')
    assertNoMutatingControl(container)
  })

  it('input-checkbox renders its checked state as a disabled checkbox', () => {
    const block = inputBlock('cb', 'input-checkbox', {
      deepnote_variable_value: true,
      deepnote_input_checkbox_label: 'Agree',
    })
    const { container } = render(<InputCheckboxRenderer block={block} />)
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(checkbox).not.toBeNull()
    expect(checkbox?.checked).toBe(true)
    expect(checkbox?.disabled).toBe(true)
    expect(container.textContent).toContain('Agree')
  })

  it('input-checkbox renders an unchecked state for a false value', () => {
    const block = inputBlock('cb2', 'input-checkbox', { deepnote_variable_value: false })
    const { container } = render(<InputCheckboxRenderer block={block} />)
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(checkbox?.checked).toBe(false)
    expect(checkbox?.disabled).toBe(true)
  })

  it('input-select renders the chosen single option, no mutating control', () => {
    const block = inputBlock('s', 'input-select', {
      deepnote_variable_value: 'Option B',
      deepnote_variable_options: ['Option A', 'Option B', 'Option C'],
    })
    const { container } = render(<InputSelectRenderer block={block} />)
    expect(container.textContent).toContain('Option B')
    assertNoMutatingControl(container)
  })

  it('input-select renders multiple chosen options joined, no mutating control', () => {
    const block = inputBlock('sm', 'input-select', {
      deepnote_variable_value: ['Red', 'Blue'],
      deepnote_allow_multiple_values: true,
    })
    const { container } = render(<InputSelectRenderer block={block} />)
    expect(container.textContent).toContain('Red')
    expect(container.textContent).toContain('Blue')
    assertNoMutatingControl(container)
  })

  it('input-slider renders its value/position via a read-only progress, no range input', () => {
    const block = inputBlock('sl', 'input-slider', {
      deepnote_variable_value: '30',
      deepnote_slider_min_value: 0,
      deepnote_slider_max_value: 100,
      deepnote_slider_step: 1,
    })
    const { container } = render(<InputSliderRenderer block={block} />)
    // The numeric value is shown as text...
    expect(container.textContent).toContain('30')
    // ...and the position is reflected by a non-interactive <progress> (no range <input>).
    const progress = container.querySelector('progress') as HTMLProgressElement | null
    expect(progress).not.toBeNull()
    expect(progress?.value).toBe(30)
    expect(progress?.max).toBe(100)
    assertNoMutatingControl(container)
  })

  it('input-date renders its persisted date, no date picker', () => {
    const block = inputBlock('d', 'input-date', { deepnote_variable_value: '2026-06-13' })
    const { container } = render(<InputDateRenderer block={block} />)
    expect(container.textContent).toContain('2026-06-13')
    assertNoMutatingControl(container)
  })

  it('input-date-range renders an absolute [start, end] tuple, no range picker', () => {
    const block = inputBlock('dr', 'input-date-range', {
      deepnote_variable_value: ['2026-01-01', '2026-03-31'],
    })
    const { container } = render(<InputDateRangeRenderer block={block} />)
    expect(container.textContent).toContain('2026-01-01')
    expect(container.textContent).toContain('2026-03-31')
    assertNoMutatingControl(container)
  })

  it('input-date-range renders a relative-range string', () => {
    const block = inputBlock('dr2', 'input-date-range', { deepnote_variable_value: 'past7days' })
    const { container } = render(<InputDateRangeRenderer block={block} />)
    expect(container.textContent).toContain('past7days')
    assertNoMutatingControl(container)
  })

  it('input-file renders its persisted filename, no file chooser', () => {
    const block = inputBlock('f', 'input-file', { deepnote_variable_value: 'data.csv' })
    const { container } = render(<InputFileRenderer block={block} />)
    expect(container.textContent).toContain('data.csv')
    assertNoMutatingControl(container)
  })

  it('input-file with no selection renders a placeholder, no file chooser', () => {
    const block = inputBlock('f2', 'input-file', { deepnote_variable_value: '' })
    const { container } = render(<InputFileRenderer block={block} />)
    expect(container.textContent).toContain('No file selected')
    assertNoMutatingControl(container)
  })

  // ── Capstone (input) ──────────────────────────────────────────────────────────────────
  // An input block renders its label + current persisted value from `deepnote_variable_value`
  // in real DOM (jsdom), with no mutating control — the unfakeable read-only assertion.
  it('CAPSTONE: an input renders label + persisted deepnote_variable_value read-only', () => {
    const block = inputBlock('cap', 'input-text', {
      deepnote_input_label: 'Threshold',
      deepnote_variable_value: '0.95',
    })
    const { container } = render(<InputTextRenderer block={block} />)
    const root = container.querySelector('.input-renderer') as HTMLElement | null
    expect(root).not.toBeNull()
    expect(root?.querySelector('[data-input-label="true"]')?.textContent).toBe('Threshold')
    expect(root?.querySelector('[data-input-value="true"]')?.textContent).toContain('0.95')
    assertNoMutatingControl(container)
  })
})
