import type { RunId, WsServerEvent } from '@deepnote/runtime-server/types'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ExecutionClient, ExecutionClientStatus } from './ExecutionClient'
import { useExecution } from './useExecution'

// `useExecution` (design `m3-s3-live-execution.md` Phase 2): wires `ExecutionClient` ⇄ `runStore` ⇄
// React. It holds the `RunState`, exposes `runBlock`/`runAll`/`cancel` + per-block selectors, and —
// crucially — binds `runId → blockId(s)` from the HTTP-trigger RESOLUTION (KD-2), not inferred from
// events. The two MUST-have tests from review are L1 (single-runId binding across HTTP→WS) and L2
// (reconnect-strand). They drive a fake client we control: the test resolves the trigger to a runId
// and pushes WS frames carrying that SAME id, and fires the close→reconnect notification.

// ── Fake ExecutionClient ─────────────────────────────────────────────────────────────────────────

/** A test-driven {@link ExecutionClient}: the test sets the runId a trigger resolves to, then pushes
 *  WS frames and a reconnect signal that the hook subscribes to. No real socket, no real fetch. */
class FakeExecutionClient implements ExecutionClient {
  status: ExecutionClientStatus = 'open'
  /** The next runId `runBlock`/`runAll` will resolve to — the HTTP-trigger return (KD-2). */
  nextRunId: RunId = 1
  /** Recorded cancels, so a test can assert `cancel(runId)` reached the transport. */
  readonly cancelled: RunId[] = []
  /** The trigger calls the hook made, for assertions. */
  readonly triggers: Array<{ kind: 'block'; blockId: string } | { kind: 'all' }> = []

  private eventSubs = new Set<(e: WsServerEvent) => void>()
  private reconnectSubs = new Set<() => void>()

  connect(): Promise<void> {
    return Promise.resolve()
  }

  runBlock(blockId: string): Promise<RunId> {
    this.triggers.push({ kind: 'block', blockId })
    return Promise.resolve(this.nextRunId)
  }

  runAll(): Promise<RunId> {
    this.triggers.push({ kind: 'all' })
    return Promise.resolve(this.nextRunId)
  }

  cancel(runId: RunId): void {
    this.cancelled.push(runId)
  }

  subscribe(onEvent: (event: WsServerEvent) => void): () => void {
    this.eventSubs.add(onEvent)
    return () => this.eventSubs.delete(onEvent)
  }

  /** The hook subscribes to the socket-close signal so it can reset stranded blocks (S2/L2). */
  onReconnect(onReconnect: () => void): () => void {
    this.reconnectSubs.add(onReconnect)
    return () => this.reconnectSubs.delete(onReconnect)
  }

  close(): void {}

  // ── test drivers ──
  /** Push a server event to every subscriber (simulates an inbound WS frame). */
  emit(event: WsServerEvent): void {
    for (const sub of [...this.eventSubs]) sub(event)
  }

  /** Fire the socket-close / reconnect signal (simulates the WS dropping with runs in flight). */
  fireReconnect(): void {
    for (const sub of [...this.reconnectSubs]) sub()
  }
}

describe('useExecution — runId↔block correlation', () => {
  it('L1 CAPSTONE: one runId flows from the HTTP trigger into the WS frame that updates the block', async () => {
    // The runId is NOT hardcoded — it is whatever the trigger resolved. The test sets the fake's
    // return to an arbitrary value, threads that SAME value (read back from the resolved promise)
    // onto every WS frame, and asserts the originating block updates. This pins the trigger→stream
    // binding the ExecutionClient layer deliberately does not own (design Phase 2, lines 59/72).
    const client = new FakeExecutionClient()
    client.nextRunId = 4242 // an arbitrary server-assigned id
    const { result } = renderHook(() => useExecution(client))

    let resolvedRunId: RunId | undefined
    await act(async () => {
      resolvedRunId = await result.current.runBlock('b2', 'nb')
    })
    expect(resolvedRunId).toBe(4242)

    // Thread the SAME resolved runId onto the inbound frames — never a separate hardcoded id.
    const R = resolvedRunId as RunId
    act(() => {
      client.emit({ type: 'block-start', runId: R, blockId: 'b2', index: 0, total: 1 })
      client.emit({
        type: 'output',
        runId: R,
        blockId: 'b2',
        output: { output_type: 'stream', name: 'stdout', text: 'hi' } as never,
      })
      client.emit({ type: 'block-done', runId: R, blockId: 'b2', success: true, durationMs: 3 })
      client.emit({ type: 'run-done', runId: R, executedBlocks: 1, failedBlocks: 0 })
    })

    const b2 = result.current.blockState('b2')
    expect(b2.status).toBe('done')
    expect(b2.executionCount).toBe(1)
    expect(b2.outputs).toHaveLength(1)
    // A block that was never triggered has no run state leaked onto it.
    expect(result.current.blockState('b1').status).toBe('idle')
  })

  it('binds run-all to every block id the trigger resolved', async () => {
    const client = new FakeExecutionClient()
    client.nextRunId = 99
    const { result } = renderHook(() => useExecution(client, { allBlockIds: ['b1', 'b2'] }))

    let runId: RunId | undefined
    await act(async () => {
      runId = await result.current.runAll()
    })
    const R = runId as RunId
    act(() => {
      client.emit({ type: 'block-start', runId: R, blockId: 'b1', index: 0, total: 2 })
      client.emit({ type: 'block-done', runId: R, blockId: 'b1', success: true, durationMs: 1 })
      client.emit({ type: 'block-start', runId: R, blockId: 'b2', index: 1, total: 2 })
      client.emit({ type: 'block-done', runId: R, blockId: 'b2', success: true, durationMs: 1 })
      client.emit({ type: 'run-done', runId: R, executedBlocks: 2, failedBlocks: 0 })
    })
    expect(result.current.blockState('b1').status).toBe('done')
    expect(result.current.blockState('b2').status).toBe('done')
  })

  it('cancel forwards the resolved runId to the client', async () => {
    const client = new FakeExecutionClient()
    client.nextRunId = 11
    const { result } = renderHook(() => useExecution(client))
    let runId: RunId | undefined
    await act(async () => {
      runId = await result.current.runBlock('b1', 'nb')
    })
    act(() => result.current.cancel(runId as RunId))
    expect(client.cancelled).toEqual([11])
  })
})

describe('useExecution — reconnect strand (L2)', () => {
  it('L2 CAPSTONE: a terminal event lost across a reconnect does not strand the block running', async () => {
    // A block is running under runId R. The socket closes BEFORE its terminal frame arrives (the
    // broadcast WS has no per-client replay, so the terminal event is genuinely lost). Reconnect
    // must reset the non-terminal owned block to `idle` so it can't remain `running` forever.
    const client = new FakeExecutionClient()
    client.nextRunId = 555
    const { result } = renderHook(() => useExecution(client))

    let R: RunId | undefined
    await act(async () => {
      R = await result.current.runBlock('b1', 'nb')
    })
    act(() => {
      client.emit({ type: 'block-start', runId: R as RunId, blockId: 'b1', index: 0, total: 1 })
    })
    expect(result.current.blockState('b1').status).toBe('running')

    // Socket drops; the terminal block-done/run-done for R is never delivered.
    act(() => client.fireReconnect())

    expect(result.current.blockState('b1').status).toBe('idle')
  })
})
