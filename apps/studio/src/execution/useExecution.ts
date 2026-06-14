import type { RunId } from '@deepnote/runtime-server/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyEvent,
  applyReconnect,
  type BlockRunState,
  freshBlockState,
  initialRunState,
  type RunState,
} from '../state/runStore'
import type { ExecutionClient } from './ExecutionClient'

// `useExecution` (design `m3-s3-live-execution.md` Phase 2): the wire between the `ExecutionClient`
// transport and the `runStore` reducer, exposed to React.
//
// It holds the `RunState`, exposes `runBlock`/`runAll`/`cancel` + per-block selectors, and owns the
// `runId → blockId(s)` correlation. Per KD-2 the correlation is bound at HTTP-trigger TIME — the
// `runId` the `runBlock`/`runAll` promise resolves to is recorded against the block(s) it ran BEFORE
// any event arrives — never inferred from the broadcast (which is multi-producer and would be
// fragile). The same map is then handed to the pure reducer as `ctx.runIdToBlocks`, so a streamed
// frame carrying that `runId` updates exactly the originating block(s). One client + one store per
// loaded project (the backend has one queue/kernel, KD-1).

/** Options the hook needs to bind a run-all to every block it spans. */
export interface UseExecutionOptions {
  /** Every runnable block id, so `runAll` can bind its single `runId` to the whole project. */
  allBlockIds?: string[]
}

/** The execution API a component consumes: triggers, cancel, and per-block + banner selectors. */
export interface UseExecutionResult {
  /** Trigger a single-block run; resolves the server `runId` (bound to this block). */
  runBlock(blockId: string, notebookName: string): Promise<RunId>
  /** Trigger a whole-project run-all; resolves the single `runId` (bound to every block). */
  runAll(): Promise<RunId>
  /** Cancel a run by the `runId` a trigger resolved. */
  cancel(runId: RunId): void
  /** The current run state of one block (a fresh idle state when never run this session). */
  blockState(blockId: string): BlockRunState
  /** The whole state, for callers that need run-level info or the kernel banner. */
  state: RunState
}

/**
 * Wire an {@link ExecutionClient} to the `runStore` reducer and expose the execution API to React.
 *
 * @param client The single execution transport for the loaded project (KD-1).
 * @param options `allBlockIds` lets `runAll` bind its one `runId` to every block (KD-2 run-all).
 */
export function useExecution(client: ExecutionClient, options: UseExecutionOptions = {}): UseExecutionResult {
  const { allBlockIds } = options
  const [state, setState] = useState<RunState>(initialRunState)

  // The correlation map (KD-2). Held in a ref — NOT React state — because it is bound synchronously
  // at trigger time and read inside the event handler; it must never trigger a re-render and must be
  // current the instant a frame arrives, with no batching delay.
  const runIdToBlocksRef = useRef<Map<RunId, string[]>>(new Map())

  // Subscribe to the event stream and the reconnect signal once per client. The reducer reads the
  // live correlation map via the ref, so the subscription closure stays stable across renders.
  useEffect(() => {
    const ctx = { runIdToBlocks: runIdToBlocksRef.current }
    const unsubscribeEvents = client.subscribe(event => {
      setState(prev => applyEvent(prev, event, ctx))
    })
    const unsubscribeReconnect = client.onReconnect(() => {
      // A terminal event may have been lost across the drop (no replay) — reset stranded blocks (S2).
      setState(prev => applyReconnect(prev))
    })
    return () => {
      unsubscribeEvents()
      unsubscribeReconnect()
    }
  }, [client])

  /** Record a `runId → blockIds` binding before any event for that run can arrive (KD-2). */
  const bind = useCallback((runId: RunId, blockIds: string[]): void => {
    runIdToBlocksRef.current.set(runId, blockIds)
  }, [])

  const runBlock = useCallback(
    async (blockId: string, notebookName: string): Promise<RunId> => {
      const runId = await client.runBlock(blockId, notebookName)
      bind(runId, [blockId])
      return runId
    },
    [client, bind]
  )

  const runAll = useCallback(async (): Promise<RunId> => {
    const runId = await client.runAll()
    bind(runId, allBlockIds ?? [])
    return runId
  }, [client, bind, allBlockIds])

  const cancel = useCallback(
    (runId: RunId): void => {
      client.cancel(runId)
    },
    [client]
  )

  const blockState = useCallback(
    (blockId: string): BlockRunState => state.byBlock[blockId] ?? freshBlockState(),
    [state]
  )

  return { runBlock, runAll, cancel, blockState, state }
}
