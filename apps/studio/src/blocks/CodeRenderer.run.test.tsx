import type { IOutput } from '@deepnote/runtime-server/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CodeRenderer } from './CodeRenderer'
import { makeBlock } from './testBlocks'

// CodeRenderer with the optional `run` prop (design Phase 3). The prop is ADDITIVE: when it is
// absent the renderer keeps its s2 read-only behaviour (covered by CodeRenderer.test.tsx — no
// button, persisted outputs only). When present it gains the Run control and selects LIVE outputs
// over persisted while a session run exists for the block (KD-3 replace-on-start semantics).
const stream = (text: string): IOutput => ({ output_type: 'stream', name: 'stdout', text })

describe('CodeRenderer — run affordance (optional `run` prop)', () => {
  it('renders a Run control that dispatches the block run when clicked', () => {
    const onRun = vi.fn()
    const block = makeBlock('r1', 'code', 'print(1)')
    render(<CodeRenderer block={block} run={{ status: 'idle', outputs: [], executionCount: 0, canRun: true, onRun }} />)
    const button = screen.getByRole('button', { name: /run/i })
    fireEvent.click(button)
    expect(onRun).toHaveBeenCalledTimes(1)
  })

  it('disables Run when the block cannot run (no kernel — KD-6)', () => {
    const onRun = vi.fn()
    const block = makeBlock('r2', 'code', 'print(1)')
    render(
      <CodeRenderer block={block} run={{ status: 'idle', outputs: [], executionCount: 0, canRun: false, onRun }} />
    )
    expect((screen.getByRole('button', { name: /run/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders LIVE outputs through OutputRenderer once the block has a session run', () => {
    const block = makeBlock('r3', 'code', 'print("hi")', {
      outputs: [stream('persisted-line\n')],
    })
    const { container } = render(
      <CodeRenderer
        block={block}
        run={{ status: 'done', outputs: [stream('live-line\n')], executionCount: 1, canRun: true, onRun: vi.fn() }}
      />
    )
    const region = container.querySelector('.output-renderer')
    expect(region).not.toBeNull()
    // The session run REPLACES the persisted output (KD-3): live shows, persisted is gone.
    expect(region?.textContent).toContain('live-line')
    expect(region?.textContent).not.toContain('persisted-line')
  })

  it('shows PERSISTED outputs for a never-run block (status idle — s2 regression)', () => {
    const block = makeBlock('r4', 'code', 'print("hi")', {
      outputs: [stream('persisted-line\n')],
    })
    const { container } = render(
      <CodeRenderer
        block={block}
        run={{ status: 'idle', outputs: [], executionCount: 0, canRun: true, onRun: vi.fn() }}
      />
    )
    const region = container.querySelector('.output-renderer')
    expect(region?.textContent).toContain('persisted-line')
  })

  it('surfaces the execution count from the run prop once a block has succeeded (Jupyter In [N])', () => {
    const block = makeBlock('r6', 'code', 'print("hi")')
    const { container } = render(
      <CodeRenderer
        block={block}
        run={{ status: 'done', outputs: [stream('live-line\n')], executionCount: 2, canRun: true, onRun: vi.fn() }}
      />
    )
    const badge = container.querySelector('[data-run-count]')
    expect(badge).not.toBeNull()
    expect(badge?.getAttribute('data-run-count')).toBe('2')
  })

  it('clears output while a fresh run is in flight (block-start replaced outputs with [])', () => {
    // KD-3: block-start sets the session outputs to [] before new frames stream. A running block
    // with empty live outputs must NOT fall back to the stale persisted output.
    const block = makeBlock('r5', 'code', 'print("hi")', {
      outputs: [stream('persisted-line\n')],
    })
    const { container } = render(
      <CodeRenderer
        block={block}
        run={{ status: 'running', outputs: [], executionCount: 0, canRun: true, onRun: vi.fn() }}
      />
    )
    // No persisted output bleeds through while the block is running.
    expect(container.querySelector('.output-renderer')?.textContent ?? '').not.toContain('persisted-line')
  })
})
