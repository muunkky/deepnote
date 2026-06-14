import type { BlockRunStatus } from '../state/runStore'

// RunControl (design `m3-s3-live-execution.md` Phase 3, KD-4): the single mutating affordance the s3
// viewer gains over the s2 read-only posture — a Run button plus a status pill reflecting the
// block's `BlockRunStatus`. It is inert in itself (it dispatches the caller's `onRun`; it runs
// nothing), and it is DISABLED when the block cannot run (the KD-6 no-kernel gate). It carries the
// `data-run-control` / `data-run-status` hooks the read-only-invariant allowlist test asserts
// against, so the run affordance is structurally distinguishable from every other (inert) control.

export interface RunControlProps {
  /** The block's current run lifecycle, surfaced as the status pill. */
  status: BlockRunStatus
  /** Whether the block can run right now (false → no kernel; the control is disabled). */
  canRun: boolean
  /** Dispatched on click — the caller triggers the actual run (KD-2 HTTP trigger). */
  onRun: () => void
}

/** Queued and running are the in-flight states that show a busy spinner. */
function isBusy(status: BlockRunStatus): boolean {
  return status === 'queued' || status === 'running'
}

/** A short human label for each lifecycle state, shown in the status pill. */
const STATUS_LABEL: Record<BlockRunStatus, string> = {
  idle: 'Idle',
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
}

export function RunControl({ status, canRun, onRun }: RunControlProps) {
  const busy = isBusy(status)
  return (
    <div className='run-control' data-run-control='true' data-run-status={status}>
      <button
        type='button'
        className='run-control__button'
        disabled={!canRun}
        aria-label='Run'
        aria-busy={busy}
        onClick={() => {
          if (canRun) onRun()
        }}
      >
        Run
      </button>
      <span className='run-control__status' aria-live='polite'>
        {busy ? <span className='run-control__spinner' data-run-busy='true' aria-hidden='true' /> : null}
        <span className='run-control__status-label'>{STATUS_LABEL[status]}</span>
      </span>
    </div>
  )
}
