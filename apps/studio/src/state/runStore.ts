import type { IOutput, KernelFailureCategory, RunId, WsServerEvent } from '@deepnote/runtime-server/types'

// The execution-state reducer (design `m3-s3-live-execution.md` Phase 2).
//
// `applyEvent(state, event, ctx)` folds the ordered, `runId`-tagged `WsServerEvent` broadcast into
// per-block run state + counts + a server-level kernel banner. It is a PURE function — no socket, no
// side effects — so it is the highest-value, most-deterministic surface to test (design Test
// Strategy). The `runId → blockId(s)` correlation is NOT inferred from events; it is bound at
// HTTP-trigger time by `useExecution` (KD-2) and handed in via `ctx.runIdToBlocks`, so the reducer
// always knows which block(s) a `runId` owns — including before its first `block-start` (so a
// run-all's `run-queued` can mark every owned block `queued`).
//
// Four correction points pinned by the design review (and by the reducer tests):
//   S1 — block count comes from `block-start.total`, NEVER the stub `run-start.totalBlocks:0`.
//   KD-3 — `block-start` REPLACES the block's outputs (a fresh execution clears prior output).
//   M3 — `executionCount` bumps per-block on `block-done` SUCCESS, not once per `run-done`.
//   S2 — reconnect (socket close, NOT a WsServerEvent) resets non-terminal owned blocks to `idle`;
//        the broadcast has no per-client replay, so a missed terminal must not strand a block.

/** Per-block execution lifecycle the UI renders against. */
export type BlockRunStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed'

/** The run state of a single block: status + live outputs + count + failure detail. */
export interface BlockRunState {
  status: BlockRunStatus
  /** Live, accumulating outputs; replaces persisted while present (KD-3). */
  outputs: IOutput[]
  /** Increments on each successful `block-done` for this block this session (M3). */
  executionCount: number
  /** A within-block back-pressure `{truncated:true}` marker arrived for this block (R5). */
  truncated: boolean
  /** The typed failure category when this block failed (in-block exception or kernel death). */
  failureCategory?: KernelFailureCategory
}

/** Per-run status, keyed by the server `runId`. */
export type RunStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

/** The whole execution state: per-block state, per-run status, and the server-level kernel banner. */
export interface RunState {
  byBlock: Record<string, BlockRunState>
  runs: Record<RunId, { blockIds: string[]; status: RunStatus }>
  /** Server-level kernel failure (missing/launch/death) → an actionable banner (R4/KD-5). */
  kernelBanner?: { category: KernelFailureCategory; message: string }
}

/** The correlation context: which block(s) each in-flight `runId` owns (bound at trigger time). */
export interface RunContext {
  runIdToBlocks: Map<RunId, string[]>
}

/** The empty starting state — no blocks tracked, no runs, no banner. */
export const initialRunState: RunState = { byBlock: {}, runs: {} }

/**
 * The default state for a block the reducer has not seen yet — `idle`, no outputs, count 0. Exported
 * so the hook's `blockState` selector returns this exact shape for a never-run block (rather than a
 * second hand-rolled literal that could drift from the reducer's seed).
 */
export function freshBlockState(): BlockRunState {
  return { status: 'idle', outputs: [], executionCount: 0, truncated: false }
}

/** A terminal block status cannot be reset by reconnect (its run already finished). */
function isTerminal(status: BlockRunStatus): boolean {
  return status === 'done' || status === 'failed'
}

/** Resolve the block ids a `runId` owns, falling back to an empty list when unbound. */
function blocksFor(runId: RunId, ctx: RunContext): string[] {
  return ctx.runIdToBlocks.get(runId) ?? []
}

/** Immutably patch a single block's state, seeding a fresh entry when absent. */
function patchBlock(state: RunState, blockId: string, patch: Partial<BlockRunState>): RunState {
  const current = state.byBlock[blockId] ?? freshBlockState()
  return {
    ...state,
    byBlock: { ...state.byBlock, [blockId]: { ...current, ...patch } },
  }
}

/** Immutably set a run's status, seeding its `blockIds` from the correlation map. */
function patchRun(state: RunState, runId: RunId, status: RunStatus, ctx: RunContext): RunState {
  const blockIds = state.runs[runId]?.blockIds ?? blocksFor(runId, ctx)
  return {
    ...state,
    runs: { ...state.runs, [runId]: { blockIds, status } },
  }
}

/**
 * Fold a single `WsServerEvent` into the {@link RunState}. Pure: returns a NEW state, never mutates
 * its input. The `ctx` correlation map (bound at trigger time, KD-2) tells the reducer which
 * block(s) a `runId` owns — used both to seed a run's `blockIds` and to mark every owned block
 * `queued`/`failed` for run-scoped events.
 */
export function applyEvent(state: RunState, event: WsServerEvent, ctx: RunContext): RunState {
  switch (event.type) {
    case 'run-queued': {
      // Mark the run queued and every owned block queued (run-all queues many; P1 idle skips this).
      let next = patchRun(state, event.runId, 'queued', ctx)
      for (const blockId of blocksFor(event.runId, ctx)) {
        next = patchBlock(next, blockId, { status: 'queued' })
      }
      return next
    }

    case 'run-start': {
      // The run is running. DO NOT read `totalBlocks` (stub 0, S1) — per-block total arrives on
      // each `block-start`. We don't pre-mark blocks running; that happens at their `block-start`.
      return patchRun(state, event.runId, 'running', ctx)
    }

    case 'block-start': {
      // Replace-on-start (KD-3): this block is running and its outputs are CLEARED.
      const next = patchRun(state, event.runId, 'running', ctx)
      return patchBlock(next, event.blockId, {
        status: 'running',
        outputs: [],
        truncated: false,
        failureCategory: undefined,
      })
    }

    case 'output': {
      const current = state.byBlock[event.blockId] ?? freshBlockState()
      if (event.truncated === true) {
        // The within-block back-pressure marker: set the flag, append nothing (R5).
        return patchBlock(state, event.blockId, { truncated: true })
      }
      return patchBlock(state, event.blockId, { outputs: [...current.outputs, event.output] })
    }

    case 'block-done': {
      const current = state.byBlock[event.blockId] ?? freshBlockState()
      return patchBlock(state, event.blockId, {
        status: event.success ? 'done' : 'failed',
        // Per-block count bumps on SUCCESS only (M3) — not once per run-done.
        executionCount: event.success ? current.executionCount + 1 : current.executionCount,
        failureCategory: event.failureCategory ?? current.failureCategory,
      })
    }

    case 'run-done': {
      return patchRun(state, event.runId, 'done', ctx)
    }

    case 'run-failed': {
      // Kernel-level death: set the actionable banner and mark every in-flight owned block failed.
      let next: RunState = {
        ...patchRun(state, event.runId, 'failed', ctx),
        kernelBanner: { category: event.failureCategory, message: event.message },
      }
      for (const blockId of blocksFor(event.runId, ctx)) {
        const current = next.byBlock[blockId] ?? freshBlockState()
        if (!isTerminal(current.status)) {
          next = patchBlock(next, blockId, { status: 'failed', failureCategory: event.failureCategory })
        }
      }
      return next
    }

    case 'run-cancelled': {
      // A cancelled run returns its still-queued/running owned blocks to idle.
      let next = patchRun(state, event.runId, 'cancelled', ctx)
      for (const blockId of blocksFor(event.runId, ctx)) {
        const current = next.byBlock[blockId] ?? freshBlockState()
        if (!isTerminal(current.status)) {
          next = patchBlock(next, blockId, { status: 'idle' })
        }
      }
      return next
    }

    default: {
      // Exhaustiveness: a new `WsServerEvent` variant becomes a compile error here until handled.
      const _exhaustive: never = event
      return state
    }
  }
}

/**
 * Reconnect handling (design S2 / L2): the socket dropped, and the broadcast WS has no per-client
 * replay, so any terminal event in flight is lost. Reset every NON-terminal block to `idle` so a
 * block can't remain `running`/`queued` forever after a missed terminal. Terminal (`done`/`failed`)
 * blocks are left untouched. Pure — returns a new state.
 */
export function applyReconnect(state: RunState): RunState {
  let changed = false
  const byBlock: Record<string, BlockRunState> = {}
  for (const [blockId, block] of Object.entries(state.byBlock)) {
    if (!isTerminal(block.status) && block.status !== 'idle') {
      byBlock[blockId] = { ...block, status: 'idle' }
      changed = true
    } else {
      byBlock[blockId] = block
    }
  }
  if (!changed) return state
  return { ...state, byBlock }
}
