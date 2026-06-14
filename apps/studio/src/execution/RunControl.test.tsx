import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RunControl } from './RunControl'

// RunControl (design `m3-s3-live-execution.md` Phase 3): the single new mutating affordance the
// SPA gains over the s2 read-only viewer (KD-4). A Run button plus a status pill reflecting the
// block's `BlockRunStatus`. It is inert until clicked (it dispatches the caller's `onRun`, it does
// not run anything itself), and it is DISABLED when the block cannot run — the KD-6 no-kernel gate.
describe('RunControl', () => {
  it('renders a Run button that dispatches onRun when clicked', () => {
    const onRun = vi.fn()
    render(<RunControl status='idle' canRun={true} onRun={onRun} executionCount={0} />)
    const button = screen.getByRole('button', { name: /run/i })
    expect(button).not.toBeNull()
    fireEvent.click(button)
    expect(onRun).toHaveBeenCalledTimes(1)
  })

  it('is disabled and does not dispatch when canRun is false (KD-6 no-kernel gate)', () => {
    const onRun = vi.fn()
    render(<RunControl status='idle' canRun={false} onRun={onRun} executionCount={0} />)
    const button = screen.getByRole('button', { name: /run/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(onRun).not.toHaveBeenCalled()
  })

  it('exposes the run status to assistive tech and a data hook for each lifecycle state', () => {
    const statuses = ['idle', 'queued', 'running', 'done', 'failed'] as const
    for (const status of statuses) {
      const { container, unmount } = render(
        <RunControl status={status} canRun={true} onRun={vi.fn()} executionCount={0} />
      )
      const control = container.querySelector('[data-run-control]')
      expect(control, `status=${status} renders the run-control root`).not.toBeNull()
      expect(control?.getAttribute('data-run-status'), `status=${status} pill`).toBe(status)
      unmount()
    }
  })

  it('renders an exec-count badge once executionCount > 0 and omits it at 0 (Jupyter In [N])', () => {
    // executionCount === 0 → no badge (a never-succeeded block reads exactly as s2).
    const { container: zero, unmount } = render(
      <RunControl status='idle' canRun={true} onRun={vi.fn()} executionCount={0} />
    )
    expect(zero.querySelector('[data-run-count]')).toBeNull()
    unmount()
    // A successful run surfaces the count as a `[N]` badge in the status pill.
    const { container: one } = render(<RunControl status='done' canRun={true} onRun={vi.fn()} executionCount={3} />)
    const badge = one.querySelector('[data-run-count]')
    expect(badge).not.toBeNull()
    expect(badge?.getAttribute('data-run-count')).toBe('3')
    expect(badge?.textContent).toContain('3')
  })

  it('shows a busy spinner while queued or running and not when idle/done/failed', () => {
    const busy = ['queued', 'running'] as const
    for (const status of busy) {
      const { container, unmount } = render(
        <RunControl status={status} canRun={true} onRun={vi.fn()} executionCount={0} />
      )
      expect(container.querySelector('[data-run-busy="true"]'), `status=${status} is busy`).not.toBeNull()
      unmount()
    }
    const idle = ['idle', 'done', 'failed'] as const
    for (const status of idle) {
      const { container, unmount } = render(
        <RunControl status={status} canRun={true} onRun={vi.fn()} executionCount={0} />
      )
      expect(container.querySelector('[data-run-busy="true"]'), `status=${status} is not busy`).toBeNull()
      unmount()
    }
  })
})
