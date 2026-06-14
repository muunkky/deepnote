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
    render(<RunControl status='idle' canRun={true} onRun={onRun} />)
    const button = screen.getByRole('button', { name: /run/i })
    expect(button).not.toBeNull()
    fireEvent.click(button)
    expect(onRun).toHaveBeenCalledTimes(1)
  })

  it('is disabled and does not dispatch when canRun is false (KD-6 no-kernel gate)', () => {
    const onRun = vi.fn()
    render(<RunControl status='idle' canRun={false} onRun={onRun} />)
    const button = screen.getByRole('button', { name: /run/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(onRun).not.toHaveBeenCalled()
  })

  it('exposes the run status to assistive tech and a data hook for each lifecycle state', () => {
    const statuses = ['idle', 'queued', 'running', 'done', 'failed'] as const
    for (const status of statuses) {
      const { container, unmount } = render(<RunControl status={status} canRun={true} onRun={vi.fn()} />)
      const control = container.querySelector('[data-run-control]')
      expect(control, `status=${status} renders the run-control root`).not.toBeNull()
      expect(control?.getAttribute('data-run-status'), `status=${status} pill`).toBe(status)
      unmount()
    }
  })

  it('shows a busy spinner while queued or running and not when idle/done/failed', () => {
    const busy = ['queued', 'running'] as const
    for (const status of busy) {
      const { container, unmount } = render(<RunControl status={status} canRun={true} onRun={vi.fn()} />)
      expect(container.querySelector('[data-run-busy="true"]'), `status=${status} is busy`).not.toBeNull()
      unmount()
    }
    const idle = ['idle', 'done', 'failed'] as const
    for (const status of idle) {
      const { container, unmount } = render(<RunControl status={status} canRun={true} onRun={vi.fn()} />)
      expect(container.querySelector('[data-run-busy="true"]'), `status=${status} is not busy`).toBeNull()
      unmount()
    }
  })
})
