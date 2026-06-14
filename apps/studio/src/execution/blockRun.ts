import type { IOutput } from '@deepnote/runtime-server/types'
import type { BlockRunStatus } from '../state/runStore'

// The per-block run descriptor a renderer consumes (design Phase 3). It is the narrow slice of the
// `useExecution` state + triggers a `CodeRenderer`/`SqlRenderer` needs to (a) render its Run control
// and (b) choose LIVE vs PERSISTED outputs. Passing it is OPTIONAL: when a renderer receives no
// `run` it keeps its s2 read-only behaviour (no control, persisted outputs only), which is what
// keeps the s2 renderer tests green and the read-only viewer unchanged for a never-run project.

export interface BlockRun {
  /** This block's current run lifecycle (drives the status pill + live/persisted selection). */
  status: BlockRunStatus
  /** The live, session-run outputs (replaces persisted while a session run exists — KD-3). */
  outputs: IOutput[]
  /** Successful runs this session; rendered as the RunControl `[N]` exec-count badge once > 0. */
  executionCount: number
  /** Whether the block can run now (false → no kernel; the Run control is disabled, KD-6). */
  canRun: boolean
  /** Trigger this block's run (KD-2 HTTP trigger, bound at request time by `useExecution`). */
  onRun: () => void
}

/**
 * Has this block been run THIS SESSION? Selection is by lifecycle status, NOT by `outputs.length`:
 * per KD-3 a fresh `block-start` clears the live outputs to `[]` before new frames stream, so a
 * running block legitimately has empty live outputs and must NOT fall back to the stale persisted
 * output. Any non-`idle` status means a session run owns this block, so its (possibly-empty) live
 * outputs win over persisted.
 */
export function hasSessionRun(run: BlockRun): boolean {
  return run.status !== 'idle'
}
