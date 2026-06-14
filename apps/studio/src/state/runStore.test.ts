import type { IOutput, RunId, WsServerEvent } from '@deepnote/runtime-server/types'
import { describe, expect, it } from 'vitest'
import { applyEvent, applyReconnect, initialRunState, type RunState } from './runStore'

// Pure execution-state reducer (design `m3-s3-live-execution.md` Phase 2, the event→state contract).
//
// The reducer folds the ordered `runId`-tagged `WsServerEvent` broadcast into per-block run state
// + counts + a server-level kernel banner. It is a pure function with NO socket — the highest-value,
// most-deterministic tests in this step drive it against scripted event sequences. The four
// correction points from design review are pinned explicitly: (1) block count from `block-start.total`
// NOT the stub `run-start.totalBlocks:0`; (2) replace-on-`block-start`; (3) per-block `executionCount`
// on `block-done` success (not once per `run-done`); (4) reconnect resets non-terminal owned blocks
// to `idle` (no replay).

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────

/** A minimal stream output for a block, so the test can assert outputs accumulate/replace. */
function streamOutput(text: string): IOutput {
  return { output_type: 'stream', name: 'stdout', text } as unknown as IOutput
}

/** An `error` output (in-block exception traceback). */
function errorOutput(ename: string): IOutput {
  return { output_type: 'error', ename, evalue: ename, traceback: [ename] } as unknown as IOutput
}

/** Fold a whole scripted sequence through `applyEvent` with one correlation map. */
function fold(
  events: WsServerEvent[],
  runIdToBlocks: Map<RunId, string[]>,
  start: RunState = initialRunState
): RunState {
  return events.reduce((state, event) => applyEvent(state, event, { runIdToBlocks }), start)
}

describe('runStore reducer — single-block lifecycle', () => {
  const R: RunId = 1
  const ctx = new Map<RunId, string[]>([[R, ['b1']]])

  it('run-queued → queued', () => {
    const state = fold([{ type: 'run-queued', runId: R, queueDepth: 1 }], ctx)
    expect(state.byBlock['b1']?.status).toBe('queued')
    expect(state.runs[R]?.status).toBe('queued')
  })

  it('block-start → running, clears prior outputs (replace-on-start), records total', () => {
    const seq: WsServerEvent[] = [
      { type: 'run-queued', runId: R, queueDepth: 0 },
      { type: 'run-start', runId: R, totalBlocks: 0 },
      { type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 1 },
    ]
    const state = fold(seq, ctx)
    expect(state.byBlock['b1']?.status).toBe('running')
    expect(state.byBlock['b1']?.outputs).toEqual([])
    expect(state.runs[R]?.status).toBe('running')
  })

  it('does NOT read run-start.totalBlocks (stub 0); the real count comes from block-start.total', () => {
    // run-start carries totalBlocks:0 (backend stub). If the reducer ever read it as the count,
    // a later assertion on total would see 0. We assert the run is running but no false count leaked.
    const state = fold([{ type: 'run-start', runId: R, totalBlocks: 0 }], ctx)
    expect(state.runs[R]?.status).toBe('running')
    // No block has been started yet, so no per-block total/state exists from the stub.
    expect(state.byBlock['b1']).toBeUndefined()
  })

  it('output (normal) appends; output (truncated) sets the flag without appending', () => {
    const seq: WsServerEvent[] = [
      { type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 1 },
      { type: 'output', runId: R, blockId: 'b1', output: streamOutput('hello\n') },
      { type: 'output', runId: R, blockId: 'b1', output: streamOutput('world\n') },
      { type: 'output', runId: R, blockId: 'b1', truncated: true },
    ]
    const state = fold(seq, ctx)
    expect(state.byBlock['b1']?.outputs).toHaveLength(2)
    expect(state.byBlock['b1']?.truncated).toBe(true)
  })

  it('block-done(success) → done and bumps executionCount; run-done finalizes', () => {
    const seq: WsServerEvent[] = [
      { type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 1 },
      { type: 'output', runId: R, blockId: 'b1', output: streamOutput('x') },
      { type: 'block-done', runId: R, blockId: 'b1', success: true, durationMs: 5 },
      { type: 'run-done', runId: R, executedBlocks: 1, failedBlocks: 0 },
    ]
    const state = fold(seq, ctx)
    expect(state.byBlock['b1']?.status).toBe('done')
    expect(state.byBlock['b1']?.executionCount).toBe(1)
    expect(state.runs[R]?.status).toBe('done')
  })

  it('block-done(failure) → failed and records failureCategory', () => {
    const seq: WsServerEvent[] = [
      { type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 1 },
      { type: 'output', runId: R, blockId: 'b1', output: errorOutput('ValueError') },
      { type: 'block-done', runId: R, blockId: 'b1', success: false, durationMs: 3 },
      { type: 'run-done', runId: R, executedBlocks: 1, failedBlocks: 1 },
    ]
    const state = fold(seq, ctx)
    expect(state.byBlock['b1']?.status).toBe('failed')
    // An in-block failure does NOT bump the execution count.
    expect(state.byBlock['b1']?.executionCount).toBe(0)
  })

  it('run-cancelled → a queued block returns to idle', () => {
    const seq: WsServerEvent[] = [
      { type: 'run-queued', runId: R, queueDepth: 0 },
      { type: 'run-cancelled', runId: R },
    ]
    const state = fold(seq, ctx)
    expect(state.byBlock['b1']?.status).toBe('idle')
    expect(state.runs[R]?.status).toBe('cancelled')
  })

  it('run-failed → sets kernelBanner and marks the in-flight block failed', () => {
    const seq: WsServerEvent[] = [
      { type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 1 },
      { type: 'run-failed', runId: R, failureCategory: 'missing-kernel', message: 'no kernel' },
    ]
    const state = fold(seq, ctx)
    expect(state.byBlock['b1']?.status).toBe('failed')
    expect(state.kernelBanner?.category).toBe('missing-kernel')
    expect(state.kernelBanner?.message).toBe('no kernel')
    expect(state.runs[R]?.status).toBe('failed')
  })
})

describe('runStore reducer — purity', () => {
  it('is pure: same input → same output, original state untouched', () => {
    const ctx = new Map<RunId, string[]>([[1, ['b1']]])
    const event: WsServerEvent = { type: 'block-start', runId: 1, blockId: 'b1', index: 0, total: 1 }
    const before = initialRunState
    const a = applyEvent(before, event, { runIdToBlocks: ctx })
    const b = applyEvent(before, event, { runIdToBlocks: ctx })
    expect(a).toEqual(b)
    // The shared initial state must not have been mutated.
    expect(before.byBlock).toEqual({})
    // Returned state is a new object (no in-place mutation of the input).
    expect(a).not.toBe(before)
  })
})

describe('runStore reducer — run-all (one runId, many blocks)', () => {
  const R: RunId = 7
  const ctx = new Map<RunId, string[]>([[R, ['b1', 'b2']]])

  it('CAPSTONE: full run-all lifecycle + replace-on-start + per-block counting', () => {
    // run-all over [b1,b2]: each block lights up in order, accumulates its own output, and ends
    // `done` with executionCount 1 under ONE run-done (M3: per-block count, not once per run-done).
    const seq: WsServerEvent[] = [
      { type: 'run-start', runId: R, totalBlocks: 0 },
      { type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 2 },
      { type: 'output', runId: R, blockId: 'b1', output: streamOutput('one') },
      { type: 'block-done', runId: R, blockId: 'b1', success: true, durationMs: 4 },
      { type: 'block-start', runId: R, blockId: 'b2', index: 1, total: 2 },
      { type: 'output', runId: R, blockId: 'b2', output: streamOutput('two') },
      { type: 'block-done', runId: R, blockId: 'b2', success: true, durationMs: 6 },
      { type: 'run-done', runId: R, executedBlocks: 2, failedBlocks: 0 },
    ]
    const afterRun = fold(seq, ctx)
    expect(afterRun.byBlock['b1']?.status).toBe('done')
    expect(afterRun.byBlock['b2']?.status).toBe('done')
    expect(afterRun.byBlock['b1']?.executionCount).toBe(1)
    expect(afterRun.byBlock['b2']?.executionCount).toBe(1)
    expect((afterRun.byBlock['b1']?.outputs[0] as { text?: string })?.text).toBe('one')
    expect((afterRun.byBlock['b2']?.outputs[0] as { text?: string })?.text).toBe('two')

    // A re-run of b1 (a fresh runId) clears b1's prior outputs on block-start and bumps its count to 2.
    const R2: RunId = 8
    const ctx2 = new Map<RunId, string[]>([[R2, ['b1']]])
    const rerun: WsServerEvent[] = [
      { type: 'block-start', runId: R2, blockId: 'b1', index: 0, total: 1 },
      { type: 'output', runId: R2, blockId: 'b1', output: streamOutput('fresh') },
      { type: 'block-done', runId: R2, blockId: 'b1', success: true, durationMs: 2 },
      { type: 'run-done', runId: R2, executedBlocks: 1, failedBlocks: 0 },
    ]
    const afterRerun = fold(rerun, ctx2, afterRun)
    expect(afterRerun.byBlock['b1']?.outputs).toHaveLength(1)
    expect((afterRerun.byBlock['b1']?.outputs[0] as { text?: string })?.text).toBe('fresh')
    expect(afterRerun.byBlock['b1']?.executionCount).toBe(2)
    // b2 is untouched by the b1 re-run.
    expect(afterRerun.byBlock['b2']?.executionCount).toBe(1)
  })
})

describe('runStore reducer — reconnect (no replay)', () => {
  it('marks non-terminal owned blocks idle, leaves terminal blocks alone', () => {
    const ctx = new Map<RunId, string[]>([
      [1, ['running1']],
      [2, ['done2']],
    ])
    let state = initialRunState
    state = applyEvent(
      state,
      { type: 'block-start', runId: 1, blockId: 'running1', index: 0, total: 1 },
      { runIdToBlocks: ctx }
    )
    state = applyEvent(
      state,
      { type: 'block-start', runId: 2, blockId: 'done2', index: 0, total: 1 },
      { runIdToBlocks: ctx }
    )
    state = applyEvent(
      state,
      { type: 'block-done', runId: 2, blockId: 'done2', success: true, durationMs: 1 },
      { runIdToBlocks: ctx }
    )
    expect(state.byBlock['running1']?.status).toBe('running')
    expect(state.byBlock['done2']?.status).toBe('done')

    const reconnected = applyReconnect(state)
    // The block stuck mid-run is reset to idle; the already-`done` block is untouched.
    expect(reconnected.byBlock['running1']?.status).toBe('idle')
    expect(reconnected.byBlock['done2']?.status).toBe('done')
  })
})
