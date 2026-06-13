import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BlockVM } from '../shell/viewModels'
import { ButtonRenderer } from './ButtonRenderer'
import { makeBlock } from './testBlocks'

// Read-only `button` renderer (design Phase 8a, R8). A button in a live notebook fires
// execution / sets a variable; the viewer must render it as a STATIC, non-firing affordance:
// label visible, disabled, no click handler, no state mutation.

function buttonBlock(metadata: Record<string, unknown> = {}): BlockVM {
  return makeBlock('b', 'button', '', { metadata })
}

describe('ButtonRenderer', () => {
  // ── Capstone (button) ─────────────────────────────────────────────────────────────────
  it('CAPSTONE: renders the persisted button label in real DOM and does not fire on click', () => {
    const block = buttonBlock({ deepnote_button_title: 'Run report' })
    const { container } = render(<ButtonRenderer block={block} />)
    const button = container.querySelector('button') as HTMLButtonElement | null
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Run report')
    // No click handler, disabled — clicking is inert. A disabled button does not dispatch
    // click events; assert it both ways: no onClick prop reached the DOM and the element is
    // disabled, so a click cannot trigger execution or state mutation.
    expect(button?.disabled).toBe(true)
    expect(button?.onclick).toBeNull()
    // Firing a click does not throw and has no observable effect (nothing to mutate).
    const spy = vi.spyOn(console, 'error')
    fireEvent.click(button as HTMLButtonElement)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('falls back to a generic label when no title is persisted', () => {
    const { container } = render(<ButtonRenderer block={buttonBlock()} />)
    const button = container.querySelector('button') as HTMLButtonElement | null
    expect(button?.textContent).toBe('Button')
    expect(button?.disabled).toBe(true)
  })
})
