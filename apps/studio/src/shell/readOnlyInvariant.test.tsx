import type { RunId, WsServerEvent } from '@deepnote/runtime-server/types'
import { render, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import type { ExecutionClient } from '../execution/ExecutionClient'
import { Shell } from './Shell'

// The read-only-invariant allowlist (design Phase 3, KD-4). The s2 viewer is read-only (R8): the
// ONLY mutating affordance s3 adds is the Run / Run-all controls. This test renders the assembled
// Shell with execution wired and asserts that EVERY interactive control in the rendered notebook is
// on the allowlist — a run affordance (`data-run-control` / `data-run-all`) or a pure navigation
// button (the notebook switcher, which mutates view state only, never project/kernel state). Any
// other enabled `<button>`, or any enabled mutating form control, fails the invariant.

function noopClient(): ExecutionClient {
  return {
    connect: () => Promise.resolve(),
    runBlock: () => Promise.resolve(1 as RunId),
    runAll: () => Promise.resolve(1 as RunId),
    cancel: () => {},
    subscribe: (_onEvent: (event: WsServerEvent) => void) => () => {},
    onReconnect: () => () => {},
    status: 'open',
    close: () => {},
  }
}

beforeEach(() => {
  window.location.hash = ''
})
afterEach(() => {
  window.location.hash = ''
})

describe('apps/studio read-only invariant — only Run/Run-all are mutating affordances (KD-4)', () => {
  it('every button in the assembled Shell is a run affordance or a navigation button', () => {
    const { container } = render(
      <Shell project={sampleProject.project} client={noopClient()} kernelLanguage='python' />
    )

    const nav = container.querySelector('nav')
    const offenders: string[] = []
    for (const button of container.querySelectorAll('button')) {
      const isRunControl = button.closest('[data-run-control]') !== null
      const isRunAll = button.hasAttribute('data-run-all') || button.closest('[data-run-all]') !== null
      const isNav = nav?.contains(button) === true
      if (!isRunControl && !isRunAll && !isNav) {
        offenders.push(button.outerHTML.slice(0, 120))
      }
    }
    expect(offenders, `non-allowlisted button(s):\n${offenders.join('\n')}`).toEqual([])
  })

  it('no editable text/select/textarea control became mutable (inputs stay inert)', () => {
    const { container } = render(
      <Shell project={sampleProject.project} client={noopClient()} kernelLanguage='python' />
    )
    // No enabled free-text/select/textarea anywhere in the rendered notebook. (A disabled checkbox
    // reflecting persisted state is allowed — covered by InputRenderers.test.tsx — so we only flag
    // ENABLED mutating controls here.)
    const mutables = container.querySelectorAll(
      'textarea:not([disabled]), select:not([disabled]), input[type="text"]:not([disabled]), input[type="number"]:not([disabled]), [contenteditable="true"]'
    )
    expect(mutables.length, 'no enabled editable control may appear in the read-only viewer').toBe(0)
  })

  it('with no kernel, the run affordances are present but disabled (gate, not removal)', () => {
    const { container } = render(<Shell project={sampleProject.project} client={noopClient()} kernelLanguage={null} />)
    const runControls = container.querySelectorAll('[data-run-control] button, button[data-run-all]')
    expect(runControls.length).toBeGreaterThan(0)
    for (const button of runControls) {
      expect((button as HTMLButtonElement).disabled, 'run affordance disabled when no kernel').toBe(true)
    }
    // And the navigation still works (a nav button is never disabled by the kernel gate).
    const nav = container.querySelector('nav')
    expect(nav).not.toBeNull()
    const navButtons = within(nav as HTMLElement).queryAllByRole('button')
    expect(navButtons.some(b => !(b as HTMLButtonElement).disabled)).toBe(true)
  })
})
