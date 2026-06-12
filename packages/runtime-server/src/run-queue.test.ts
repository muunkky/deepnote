import type { DeepnoteBlock } from '@deepnote/blocks'
import { type BlockExecutionResult, type ExecutionSummary, type IOutput, KernelDiedError } from '@deepnote/runtime-core'
import { describe, expect, it } from 'vitest'
import type { WsServerEvent } from './api-types'
import {
  type EventSink,
  type RunCallbacks,
  type RunProjectTarget,
  type RunQueueOptions,
  type RunRequest,
  RunQueue,
} from './run-queue'

/** A plain `runProject` function shape, for the mocks below. */
type RunProjectFn = RunProjectTarget['runProject']

/** Build a queue from a bare `runProject` function — wraps it in the {@link RunProjectTarget}. */
function q(runProject: RunProjectFn, sink: EventSink, options?: RunQueueOptions): RunQueue {
  return new RunQueue({ runProject }, sink, options)
}

/**
 * R4 run-serialization tests (the load-bearing card). Everything here is **mocked** — a fake
 * `runProject` drives the adapter and a recording {@link RecordingSink} captures the WS event
 * log, exactly as the design doc's test strategy prescribes (no real kernel timing luck). The
 * structural M2 invariant (`engine.runProject` referenced only by `run-queue.ts`) is asserted
 * separately in `run-queue-invariant.test.ts`.
 */

/** A recording {@link EventSink} with a controllable `bufferedAmount` for back-pressure tests. */
class RecordingSink implements EventSink {
  readonly events: WsServerEvent[] = []
  bufferedAmount = 0
  send(event: WsServerEvent): void {
    this.events.push(event)
  }
}

/** A minimal block — the adapter only reads `id`. */
function block(id: string): DeepnoteBlock {
  return { id, type: 'code', content: '', sortingKey: 'a', blockGroup: id, metadata: {} } as DeepnoteBlock
}

function streamOutput(text: string): IOutput {
  return { output_type: 'stream', name: 'stdout', text }
}

function summary(over: Partial<ExecutionSummary> = {}): ExecutionSummary {
  return { totalBlocks: 1, executedBlocks: 1, failedBlocks: 0, totalDurationMs: 1, ...over }
}

/** Resolve after a macrotask so a queued microtask drain can interleave (or be proven not to). */
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

describe('RunQueue — enqueue policy (R4: P1/P2/P3/P5)', () => {
  it('P1: an idle queue runs immediately, assigning runId 1 and emitting run-start (no run-queued)', async () => {
    const sink = new RecordingSink()
    let resolveRun: (s: ExecutionSummary) => void = () => {}
    const runProject: RunProjectFn = () => new Promise<ExecutionSummary>(r => (resolveRun = r))
    const queue = q(runProject, sink)

    const result = queue.enqueue({ blockId: 'b1' })
    expect(result).toEqual({ runId: 1, accepted: true, queueDepth: 0 })
    await tick()
    expect(sink.events[0]).toEqual({ type: 'run-start', runId: 1, totalBlocks: 0 })
    expect(sink.events.some(e => e.type === 'run-queued')).toBe(false)

    resolveRun(summary())
    await tick()
  })

  it('P2: a second run while one is in flight enqueues, emits run-queued {queueDepth}, returns 202-class accepted', async () => {
    const sink = new RecordingSink()
    let resolveFirst: (s: ExecutionSummary) => void = () => {}
    const runProject: RunProjectFn = () => new Promise<ExecutionSummary>(r => (resolveFirst = r))
    const queue = q(runProject, sink)

    queue.enqueue({ blockId: 'b1' }) // P1: runs, blocks on the pending promise
    await tick()
    const second = queue.enqueue({ blockId: 'b2' }) // P2

    expect(second.accepted).toBe(true)
    expect(second.runId).toBe(2)
    expect(second.queueDepth).toBe(1)
    expect(sink.events).toContainEqual({ type: 'run-queued', runId: 2, queueDepth: 1 })

    resolveFirst(summary())
    await tick()
  })

  it('P3: at maxDepth a new run is REJECTED with no runId consumed and NO WS event', async () => {
    const sink = new RecordingSink()
    let resolveFirst: (s: ExecutionSummary) => void = () => {}
    const runProject: RunProjectFn = () => new Promise<ExecutionSummary>(r => (resolveFirst = r))
    const queue = q(runProject, sink, { maxDepth: 1 })

    queue.enqueue({ blockId: 'b1' }) // P1 (running)
    await tick()
    const queued = queue.enqueue({ blockId: 'b2' }) // P2 (pending.length === 1 === maxDepth now)
    expect(queued.accepted).toBe(true)

    const before = sink.events.length
    const rejected = queue.enqueue({ blockId: 'b3' }) // P3
    expect(rejected.accepted).toBe(false)
    // No WS event for the rejected request, and no runId burned (next accept reuses it).
    expect(sink.events.length).toBe(before)

    resolveFirst(summary())
    await tick()
  })

  it('P5: cancelling a QUEUED task removes it, emits run-cancelled, and it never starts', async () => {
    const sink = new RecordingSink()
    const started: RunId[] = []
    type RunId = number
    let resolveFirst: (s: ExecutionSummary) => void = () => {}
    const runProject: RunProjectFn = (req: RunRequest) => {
      started.push(Number(req.blockId?.replace('b', '')))
      return new Promise<ExecutionSummary>(r => (resolveFirst = r))
    }
    const queue = q(runProject, sink)

    queue.enqueue({ blockId: 'b1' }) // runs
    await tick()
    const second = queue.enqueue({ blockId: 'b2' }) // queued
    expect(queue.cancel(second.runId)).toBe(true)
    expect(sink.events).toContainEqual({ type: 'run-cancelled', runId: second.runId })

    resolveFirst(summary())
    await tick()
    // b2 (runId 2) was cancelled before starting — only b1 ever ran.
    expect(started).toEqual([1])
    expect(sink.events.some(e => e.type === 'run-start' && e.runId === 2)).toBe(false)
  })

  it('cancel of an unknown/running runId is a no-op (false), never faking a running-cancel (B2)', async () => {
    const sink = new RecordingSink()
    let resolveRun: (s: ExecutionSummary) => void = () => {}
    const runProject: RunProjectFn = () => new Promise<ExecutionSummary>(r => (resolveRun = r))
    const queue = q(runProject, sink)

    const first = queue.enqueue({ blockId: 'b1' }) // running
    await tick()
    expect(queue.cancel(first.runId)).toBe(false) // running task — not cancellable in s1
    expect(queue.cancel(999)).toBe(false)
    expect(sink.events.some(e => e.type === 'run-cancelled')).toBe(false)

    resolveRun(summary())
    await tick()
  })
})

describe('RunQueue — no-interleave (CAPSTONE)', () => {
  it('two overlapping runs produce a WS log where EVERY runId:1 event precedes EVERY runId:2 event', async () => {
    const sink = new RecordingSink()

    // A fake engine that yields control between its two blocks (so the SECOND run could
    // interleave if the queue did not serialize). Each run emits start→output→done per block.
    const runProject: RunProjectFn = async (req: RunRequest, cb: RunCallbacks) => {
      const b = block(`${req.blockId}`)
      await cb.onBlockStart(b, 0, 1)
      await tick() // yield: a non-serialized impl could start run 2 here
      cb.onOutput(b.id, streamOutput(`out-${req.blockId}`))
      await cb.onBlockDone({
        blockId: b.id,
        blockType: 'code',
        success: true,
        outputs: [],
        executionCount: 1,
        durationMs: 1,
      })
      return summary()
    }
    const queue = q(runProject, sink)

    // Issue A then B back-to-back over the same sink.
    queue.enqueue({ blockId: 'A' }) // runId 1
    queue.enqueue({ blockId: 'B' }) // runId 2 (queued)

    // Drain everything.
    for (let i = 0; i < 10; i++) {
      await tick()
    }

    // The no-interleave guarantee is over the *execution* stream — run-start onward. The
    // `run-queued` acknowledgment for run 2 is a queue-control event emitted synchronously at
    // enqueue (before run 1 executes); it is not part of either run's ordered output, so it is
    // excluded here (the design doc's R4 assertion is over run-start → terminal).
    const execEvents = sink.events.filter(e => e.type !== 'run-queued' && e.type !== 'run-cancelled')
    const lastRun1 = execEvents.reduce((max, e, i) => (e.runId === 1 ? i : max), -1)
    const firstRun2 = execEvents.findIndex(e => e.runId === 2)
    expect(lastRun1).toBeGreaterThanOrEqual(0)
    expect(firstRun2).toBeGreaterThan(lastRun1)
    // Run 1's terminal precedes run 2's first execution event — no runId:2 event between run 1's
    // run-start and its run-done.
    const run1Terminal = execEvents.findIndex(e => e.runId === 1 && e.type === 'run-done')
    expect(firstRun2).toBeGreaterThan(run1Terminal)

    // And within run 1: run-start → block-start → output → block-done → run-done.
    const run1 = execEvents.filter(e => e.runId === 1).map(e => e.type)
    expect(run1).toEqual(['run-start', 'block-start', 'output', 'block-done', 'run-done'])
  })
})

describe('RunQueue — guaranteed terminal event (B1)', () => {
  it('an in-block break (runProject RESOLVES, failedBlocks>0) emits a terminal run-done, then NOTHING', async () => {
    const sink = new RecordingSink()
    const runProject: RunProjectFn = async (_req: RunRequest, cb: RunCallbacks) => {
      const b = block('b1')
      await cb.onBlockStart(b, 0, 2)
      await cb.onBlockDone({
        blockId: b.id,
        blockType: 'code',
        success: false, // the failing block
        outputs: [],
        executionCount: null,
        durationMs: 1,
        error: new Error('boom'), // a plain in-block user exception
      })
      // The engine BREAKS here: block 2 of 2 is never started; runProject resolves.
      return summary({ totalBlocks: 2, executedBlocks: 1, failedBlocks: 1 })
    }
    const queue = q(runProject, sink)
    queue.enqueue({})
    for (let i = 0; i < 5; i++) await tick()

    const types = sink.events.map(e => e.type)
    // The terminal is run-done (NOT run-failed) and carries failedBlocks>0.
    const terminalIndex = types.lastIndexOf('run-done')
    expect(terminalIndex).toBe(types.length - 1) // nothing after the terminal
    expect(sink.events.some(e => e.type === 'run-failed')).toBe(false)
    const done = sink.events[terminalIndex]
    expect(done).toMatchObject({ type: 'run-done', failedBlocks: 1 })

    // The failing block's block-done carries failureCategory:'in-block' (KD-5).
    const blockDone = sink.events.find(e => e.type === 'block-done')
    expect(blockDone).toMatchObject({ success: false, failureCategory: 'in-block' })
  })
})

describe('RunQueue — kernel-death terminal (KD-5)', () => {
  it('a runProject REJECT with KernelDiedError emits terminal run-failed {kernel-died}; the consumer does not hang', async () => {
    const sink = new RecordingSink()
    const runProject: RunProjectFn = async (_req: RunRequest, cb: RunCallbacks) => {
      await cb.onBlockStart(block('b1'), 0, 1)
      throw new KernelDiedError('kernel died mid-run')
    }
    const queue = q(runProject, sink)
    queue.enqueue({})
    for (let i = 0; i < 5; i++) await tick()

    const terminal = sink.events[sink.events.length - 1]
    expect(terminal).toMatchObject({ type: 'run-failed', failureCategory: 'kernel-died', message: 'kernel died mid-run' })
    // Read the discriminant from the typed instance, NOT a stringified message: a plain
    // Error with 'kernel-died' in its text must NOT be mapped to kernel-died.
    expect(sink.events.some(e => e.type === 'run-done')).toBe(false)
  })

  it('a non-kernel reject still terminates the run (in-block fallback), never hangs', async () => {
    const sink = new RecordingSink()
    const runProject: RunProjectFn = async () => {
      throw new Error('the word kernel-died appears here but this is a plain Error')
    }
    const queue = q(runProject, sink)
    queue.enqueue({})
    for (let i = 0; i < 5; i++) await tick()
    const terminal = sink.events[sink.events.length - 1]
    // Typed-instance discriminant: a plain Error is NOT kernel-died.
    expect(terminal).toMatchObject({ type: 'run-failed', failureCategory: 'in-block' })
  })
})

describe('RunQueue — failure-category fidelity (KD-5, mix)', () => {
  it('block-done with a mid-run KernelDiedError reports kernel-died, not in-block', async () => {
    const sink = new RecordingSink()
    const runProject: RunProjectFn = async (_req: RunRequest, cb: RunCallbacks) => {
      await cb.onBlockDone({
        blockId: 'b1',
        blockType: 'code',
        success: false,
        outputs: [],
        executionCount: null,
        durationMs: 1,
        error: new KernelDiedError(), // the typed kernel-died instance reaches the seam
      })
      return summary({ failedBlocks: 1 })
    }
    const queue = q(runProject, sink)
    queue.enqueue({})
    for (let i = 0; i < 5; i++) await tick()
    const blockDone = sink.events.find(e => e.type === 'block-done')
    expect(blockDone).toMatchObject({ failureCategory: 'kernel-died' })
  })
})

describe('RunQueue — back-pressure regime 1 (cross-block: production pauses)', () => {
  it('a high bufferedAmount keeps the awaited onBlockDone from resolving, so the engine does not start the next block', async () => {
    const sink = new RecordingSink()
    sink.bufferedAmount = 1_000_000 // socket is backed up

    const blocksStarted: number[] = []
    const runProject: RunProjectFn = async (_req: RunRequest, cb: RunCallbacks) => {
      // Block 0: start, done (the done await should BLOCK while bufferedAmount is high).
      blocksStarted.push(0)
      await cb.onBlockStart(block('b0'), 0, 2)
      await cb.onBlockDone({
        blockId: 'b0',
        blockType: 'code',
        success: true,
        outputs: [],
        executionCount: 1,
        durationMs: 1,
      })
      // If we reach here, the drain wait released — block 1 starts.
      blocksStarted.push(1)
      await cb.onBlockStart(block('b1'), 1, 2)
      await cb.onBlockDone({
        blockId: 'b1',
        blockType: 'code',
        success: true,
        outputs: [],
        executionCount: 2,
        durationMs: 1,
      })
      return summary({ totalBlocks: 2, executedBlocks: 2 })
    }
    const queue = q(runProject, sink, { drainPollMs: 1 })
    queue.enqueue({})

    // Give it time: while the socket stays backed up, production must NOT advance past block 0.
    for (let i = 0; i < 10; i++) await tick()
    expect(blocksStarted).toEqual([0]) // paused — block 1 has not started

    // Drain the socket; production resumes and block 1 starts.
    sink.bufferedAmount = 0
    for (let i = 0; i < 20; i++) await tick()
    expect(blocksStarted).toEqual([0, 1])
    expect(sink.events[sink.events.length - 1].type).toBe('run-done')
  })
})

describe('RunQueue — back-pressure regime 2 (within-block: bounded stream + truncation marker)', () => {
  it('a block flooding stream past the bound yields ONE {truncated:true} marker; lifecycle/result events survive', async () => {
    const sink = new RecordingSink()
    const bound = 1024 // 1 KiB bound for the test
    const runProject: RunProjectFn = async (_req: RunRequest, cb: RunCallbacks) => {
      const b = block('b1')
      await cb.onBlockStart(b, 0, 1)
      // Flood: 10 chunks of 512 bytes each = 5 KiB of stream, well past the 1 KiB bound.
      for (let i = 0; i < 10; i++) {
        cb.onOutput(b.id, streamOutput('x'.repeat(512)))
      }
      // A NON-stream result output must NEVER be dropped, even past the bound.
      cb.onOutput(b.id, { output_type: 'execute_result', data: { 'text/plain': '42' }, metadata: {}, execution_count: 1 })
      cb.onOutput(b.id, { output_type: 'error', ename: 'X', evalue: 'y', traceback: [] })
      await cb.onBlockDone({
        blockId: b.id,
        blockType: 'code',
        success: true,
        outputs: [],
        executionCount: 1,
        durationMs: 1,
      })
      return summary()
    }
    const queue = q(runProject, sink, { wsHighWaterMark: bound })
    queue.enqueue({})
    for (let i = 0; i < 5; i++) await tick()

    const outputs = sink.events.filter(e => e.type === 'output')
    const markers = outputs.filter(e => 'truncated' in e && e.truncated === true)
    // Exactly one truncation marker.
    expect(markers.length).toBe(1)

    // No stream output is forwarded after the marker (remaining stream text dropped).
    const markerIndex = sink.events.findIndex(e => e.type === 'output' && 'truncated' in e && e.truncated === true)
    const afterMarkerStream = sink.events
      .slice(markerIndex + 1)
      .filter(e => e.type === 'output' && 'output' in e && e.output.output_type === 'stream')
    expect(afterMarkerStream.length).toBe(0)

    // Lifecycle + result/error outputs survive the flood.
    const resultOutputs = outputs.filter(e => 'output' in e && (e.output.output_type === 'execute_result' || e.output.output_type === 'error'))
    expect(resultOutputs.length).toBe(2)
    expect(sink.events.some(e => e.type === 'block-start')).toBe(true)
    expect(sink.events.some(e => e.type === 'block-done')).toBe(true)
    expect(sink.events[sink.events.length - 1].type).toBe('run-done')
  })

  it('a block emitting stream UNDER the bound forwards every chunk, no marker', async () => {
    const sink = new RecordingSink()
    const runProject: RunProjectFn = async (_req: RunRequest, cb: RunCallbacks) => {
      const b = block('b1')
      await cb.onBlockStart(b, 0, 1)
      cb.onOutput(b.id, streamOutput('small'))
      cb.onOutput(b.id, streamOutput('output'))
      await cb.onBlockDone({ blockId: b.id, blockType: 'code', success: true, outputs: [], executionCount: 1, durationMs: 1 })
      return summary()
    }
    const queue = q(runProject, sink, { wsHighWaterMark: 8 * 1024 * 1024 })
    queue.enqueue({})
    for (let i = 0; i < 5; i++) await tick()
    const streamOutputs = sink.events.filter(e => e.type === 'output' && 'output' in e)
    expect(streamOutputs.length).toBe(2)
    expect(sink.events.some(e => 'truncated' in e && e.truncated === true)).toBe(false)
  })
})
