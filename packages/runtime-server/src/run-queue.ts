/**
 * `run-queue.ts` — THE run-serialization seam (design doc R4, the load-bearing section).
 *
 * The server fronts **one** kernel via **one** sequential {@link ExecutionEngine}, but an
 * interactive UI is inherently concurrent (a user hits Run on B while A is mid-run). Issued
 * naively, a second `engine.runProject` would race the first — two IOPub streams multiplexed
 * onto one output handler, producing interleaved, reordered, corrupt output. This module is
 * the single-concurrency FIFO that makes a concurrent UI safe against a sequential engine.
 *
 * **The load-bearing invariant (M2).** `drain()` is the **only** caller of the engine's
 * `runProject` (through {@link RunProjectFn}). Enforced structurally by
 * `run-queue-invariant.test.ts` — a compiler-API check that `engine.runProject` /
 * `session.runProject` is referenced **only** here — so no other module can issue an
 * un-serialized run and an interleave cannot exist by construction. The ordering test is
 * secondary; the design doc is explicit that ordering alone "proves little" because it is
 * structurally guaranteed.
 *
 * **Guaranteed terminal event (B1).** When `runProject` *resolves*, `drain` unconditionally
 * emits `run-done` carrying `failedBlocks` — this is the common in-block-failure terminal too
 * (the engine `break`s on the first failed block and resolves with `failedBlocks > 0`;
 * `execution-engine.ts:426-429/431-446`). `run-failed` is reserved **only** for the
 * kernel-death reject (a `KernelDiedError` thrown out of `runProject`). Exactly one terminal
 * event ends every run.
 *
 * **Back-pressure (S1, two regimes).** Cross-block: the engine awaits `onBlockDone`, so the
 * adapter does not resolve it until the socket's `bufferedAmount` drains — a genuine pause of
 * production, free, no buffer. Within-block: `onOutput` is synchronous/un-pausable, so a single
 * block's runaway `stream` text is bounded at `wsHighWaterMark` (default 8 MiB) and, past the
 * bound, replaced by exactly one `{ truncated: true }` marker; lifecycle/result outputs are
 * never dropped.
 */

import type { DeepnoteBlock, DeepnoteFile } from '@deepnote/blocks'
import { KernelDiedError, type KernelFailureCategory } from '@deepnote/runtime-core'
import type { BlockExecutionResult, ExecutionSummary } from '@deepnote/runtime-core'
import type { IOutput } from '@deepnote/runtime-core'
import type { RunId, WsServerEvent } from './api-types'

/** Default bounded backlog before new runs are rejected (design doc R4, `maxDepth`). */
export const DEFAULT_RUN_QUEUE_DEPTH = 8

/** Default within-block `stream` bound, in bytes (design doc S1). */
export const DEFAULT_WS_HIGH_WATER_MARK = 8 * 1024 * 1024

/** The per-run request the queue serializes. s1: single-block or run-all (no `blockIds` chain). */
export interface RunRequest {
  blockId?: string
  notebookName?: string
}

/**
 * The engine callbacks the queue's adapter drives. Structurally identical to the subset of
 * `ExecutionEngine`'s `ExecutionOptions` the adapter needs — `onBlockStart`/`onBlockDone` are
 * **awaited** by the engine (the cross-block back-pressure hook), `onOutput` is synchronous.
 */
export interface RunCallbacks {
  onBlockStart: (block: DeepnoteBlock, index: number, total: number) => void | Promise<void>
  onBlockDone: (result: BlockExecutionResult) => void | Promise<void>
  onOutput: (blockId: string, output: IOutput) => void
}

/**
 * The single object the queue is allowed to drive runs through. Modeled on {@link Session}
 * (which implements it), but injected as an interface so the queue stays the **sole** caller of
 * `.runProject` (the M2 invariant — `run-queue-invariant.test.ts` asserts no other source file
 * references `.runProject`) and is unit-testable with a mock. `runProject` rejects with a
 * {@link KernelDiedError} on mid-run kernel death and resolves with `failedBlocks > 0` on an
 * in-block break (B1).
 */
export interface RunProjectTarget {
  runProject(request: RunRequest, callbacks: RunCallbacks): Promise<ExecutionSummary>
}

/**
 * The socket sink the queue writes events to, plus the back-pressure signal. Modeled on the
 * `ws` `WebSocket` surface (`send` + `bufferedAmount`) but narrowed to what the queue needs, so
 * a stubbed socket drives the back-pressure tests without a real WebSocket.
 */
export interface EventSink {
  /** Write one app-level event to the socket, in emit order. */
  send: (event: WsServerEvent) => void
  /**
   * Bytes buffered in the socket but not yet flushed to the OS (the `ws` `bufferedAmount`).
   * Cross-block back-pressure gates on this: the adapter will not resolve the awaited
   * `onBlockDone` until it drains below {@link RunQueueOptions.wsLowWaterMark}.
   */
  readonly bufferedAmount: number
}

/** Construction options for {@link RunQueue}. */
export interface RunQueueOptions {
  /** Bounded backlog before new runs are rejected (P3). Default {@link DEFAULT_RUN_QUEUE_DEPTH}. */
  maxDepth?: number
  /** Within-block `stream` bound, in bytes (S1). Default {@link DEFAULT_WS_HIGH_WATER_MARK}. */
  wsHighWaterMark?: number
  /**
   * Low-water mark, in bytes, that cross-block back-pressure drains to before the awaited
   * `onBlockDone` resolves (S1). Default 0 — wait until the socket is fully flushed.
   */
  wsLowWaterMark?: number
  /**
   * Poll interval, in ms, for the cross-block drain wait. Default 5. Kept small so a drained
   * socket resumes production promptly; the tests inject 0 for synchronous-ish polling.
   */
  drainPollMs?: number
}

/** Result of {@link RunQueue.enqueue}: the assigned `runId` and whether it was accepted (P1/P2 vs P3). */
export interface EnqueueResult {
  runId: RunId
  /** `false` only for P3 (queue full) — the caller maps that to HTTP `429 { error: 'queue-full' }`. */
  accepted: boolean
  /** Pending depth after this enqueue (0 when it ran immediately). */
  queueDepth: number
}

interface RunTask {
  runId: RunId
  request: RunRequest
  /** Set when a QUEUED task is cancelled before it starts (P5). */
  cancelled: boolean
}

/**
 * Single-concurrency FIFO run queue. One {@link RunQueue} per connected WS stream: it owns the
 * monotonic `runId` counter, the bounded `pending` backlog, and the adapter that turns engine
 * callbacks into ordered {@link WsServerEvent}s on the {@link EventSink}.
 */
export class RunQueue {
  #running = false
  readonly #pending: RunTask[] = []
  #nextRunId: RunId = 1

  readonly #maxDepth: number
  readonly #highWaterMark: number
  readonly #lowWaterMark: number
  readonly #drainPollMs: number

  readonly #target: RunProjectTarget
  readonly #sink: EventSink

  constructor(target: RunProjectTarget, sink: EventSink, options: RunQueueOptions = {}) {
    this.#target = target
    this.#sink = sink
    this.#maxDepth = options.maxDepth ?? DEFAULT_RUN_QUEUE_DEPTH
    this.#highWaterMark = options.wsHighWaterMark ?? DEFAULT_WS_HIGH_WATER_MARK
    this.#lowWaterMark = options.wsLowWaterMark ?? 0
    this.#drainPollMs = options.drainPollMs ?? 5
  }

  /**
   * Apply the enqueue policy (R4 table) for a new run request.
   *
   * - **P1** (idle): assign a `runId`, mark running, and start draining immediately — the
   *   `run-start` event is emitted by `drain`. Returns `accepted: true, queueDepth: 0`.
   * - **P2** (in flight, `pending < maxDepth`): enqueue, emit `run-queued { queueDepth }`,
   *   return `accepted: true` — the caller maps that to HTTP `202`.
   * - **P3** (in flight, `pending === maxDepth`): **reject**, emit **no** WS event, return
   *   `accepted: false` — the caller maps that to HTTP `429 { error: 'queue-full' }`.
   */
  enqueue(request: RunRequest): EnqueueResult {
    // P3: at capacity — reject the NEW request, no WS event, no runId consumed.
    if (this.#running && this.#pending.length >= this.#maxDepth) {
      return { runId: this.#nextRunId, accepted: false, queueDepth: this.#pending.length }
    }

    const runId = this.#nextRunId++
    const task: RunTask = { runId, request, cancelled: false }

    // P1: idle — run now. `drain` emits `run-start` and serializes from here.
    if (!this.#running) {
      this.#running = true
      this.#pending.push(task)
      void this.#drain()
      return { runId, accepted: true, queueDepth: 0 }
    }

    // P2: a run is in flight and there is room — enqueue and announce the depth.
    this.#pending.push(task)
    const queueDepth = this.#pending.length
    this.#sink.send({ type: 'run-queued', runId, queueDepth })
    return { runId, accepted: true, queueDepth }
  }

  /**
   * Cancel a **queued** task (P5). Removes it from `pending`, emits `run-cancelled`, and the
   * task is never started. A `runId` that is already running or unknown is a no-op (`false`) —
   * running-cancel is an explicit m3/s5 deferral (B2); we do not fake it.
   */
  cancel(runId: RunId): boolean {
    const index = this.#pending.findIndex(task => task.runId === runId)
    if (index < 0) {
      return false
    }
    const [task] = this.#pending.splice(index, 1)
    task.cancelled = true
    this.#sink.send({ type: 'run-cancelled', runId })
    return true
  }

  /** Pending backlog depth — exposed for tests/diagnostics; the policy reads it internally. */
  get queueDepth(): number {
    return this.#pending.length
  }

  /**
   * Drain the queue one task at a time. **Never re-entrant** — `#running` guards entry, and a
   * task is only started after the previous task's `runProject` settles, so the engine never
   * sees two overlapping runs (the structural no-interleave guarantee).
   */
  async #drain(): Promise<void> {
    while (this.#pending.length > 0) {
      const task = this.#pending.shift()
      if (!task || task.cancelled) {
        continue
      }
      await this.#runTask(task)
    }
    this.#running = false
  }

  /**
   * Run one task: emit `run-start`, drive the engine via the adapter, and emit the guaranteed
   * terminal event. `run-done` on resolve (B1 — incl. an in-block break, `failedBlocks > 0`);
   * `run-failed { failureCategory }` **only** when `runProject` rejects with a typed
   * {@link KernelDiedError} (KD-5, the discriminant read from the instance, never a string).
   */
  async #runTask(task: RunTask): Promise<void> {
    const { runId, request } = task
    const adapter = this.#createAdapter(runId)

    this.#sink.send({ type: 'run-start', runId, totalBlocks: 0 })

    try {
      // The SOLE `.runProject` call site in the package (M2). No route runs the engine directly.
      const summary = await this.#target.runProject(request, adapter.callbacks)
      // B1: GUARANTEED terminal on resolve — including an in-block break (failedBlocks > 0).
      this.#sink.send({
        type: 'run-done',
        runId,
        executedBlocks: summary.executedBlocks,
        failedBlocks: summary.failedBlocks,
      })
    } catch (error) {
      // KD-5: the only reject path is mid-run kernel death. Read the discriminant from the
      // STILL-TYPED instance (exactly as run.ts:1196-1200), never from a stringified message.
      const failureCategory: KernelFailureCategory =
        error instanceof KernelDiedError ? 'kernel-died' : categoryOf(error)
      const message = error instanceof Error ? error.message : String(error)
      this.#sink.send({ type: 'run-failed', runId, failureCategory, message })
    }
  }

  /**
   * Build the engine-callback → WS-event adapter for one run. The callbacks tag every event
   * with `runId`; `onBlockStart`/`onBlockDone` return promises (the engine awaits them) so the
   * cross-block drain wait gates production; `onOutput` enforces the within-block bound.
   */
  #createAdapter(runId: RunId): { callbacks: RunCallbacks } {
    // Per-block running total of forwarded `stream` bytes, for the within-block bound. Reset on
    // each `block-start`; once the bound is crossed, a single `{ truncated: true }` marker is
    // emitted and further `stream` text for that block is dropped (lifecycle/result kept).
    let streamBytesThisBlock = 0
    let truncatedThisBlock = false

    const send = (event: WsServerEvent): void => this.#sink.send(event)

    return {
      callbacks: {
        onBlockStart: async (block, index, total): Promise<void> => {
          streamBytesThisBlock = 0
          truncatedThisBlock = false
          send({ type: 'block-start', runId, blockId: block.id, index, total })
          // Cross-block back-pressure (regime 1): do not return until the socket has drained,
          // so the engine does not start producing this block's output while the consumer is
          // behind. Mirrors the onBlockDone gate; together they pause production end-to-end.
          await this.#awaitDrain()
        },
        onOutput: (blockId, output): void => {
          // Regime 2: bound only a single block's runaway `stream` text. Lifecycle/result
          // outputs (execute_result/display_data/error/etc.) are ALWAYS forwarded.
          if (output.output_type === 'stream') {
            if (truncatedThisBlock) {
              // Already past the bound for this block — drop the remaining stream text silently
              // (the single marker was already sent).
              return
            }
            streamBytesThisBlock += streamByteLength(output)
            if (streamBytesThisBlock > this.#highWaterMark) {
              truncatedThisBlock = true
              send({ type: 'output', runId, blockId, truncated: true })
              return
            }
          }
          send({ type: 'output', runId, blockId, output })
        },
        onBlockDone: async (result): Promise<void> => {
          send({
            type: 'block-done',
            runId,
            blockId: result.blockId,
            success: result.success,
            durationMs: result.durationMs,
            // KD-5: read the in-block-vs-kernel-died discriminant from the typed `result.error`,
            // before it flattens to `.message`. A failed block with no typed kernel error is
            // an in-block user exception.
            failureCategory: result.success
              ? undefined
              : result.error instanceof KernelDiedError
                ? 'kernel-died'
                : 'in-block',
          })
          // Cross-block back-pressure (regime 1): gate the next block on the socket draining.
          await this.#awaitDrain()
        },
      },
    }
  }

  /**
   * Resolve once the sink's `bufferedAmount` is at/below the low-water mark — the cross-block
   * back-pressure wait. While the consumer is behind, the awaiting `onBlockStart`/`onBlockDone`
   * does not resolve, so the engine pauses production (it does not start the next block). Polls
   * because `ws` exposes no drain promise on the buffered byte count.
   */
  #awaitDrain(): Promise<void> {
    if (this.#sink.bufferedAmount <= this.#lowWaterMark) {
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      const poll = (): void => {
        if (this.#sink.bufferedAmount <= this.#lowWaterMark) {
          resolve()
          return
        }
        setTimeout(poll, this.#drainPollMs)
      }
      setTimeout(poll, this.#drainPollMs)
    })
  }
}

/** Byte length of a `stream` output's text, for the within-block bound. */
function streamByteLength(output: IOutput): number {
  if (output.output_type !== 'stream') {
    return 0
  }
  const text: unknown = output.text
  const asString = Array.isArray(text) ? text.join('') : text == null ? '' : String(text)
  return Buffer.byteLength(asString, 'utf8')
}

/**
 * Map a non-`KernelDiedError` reject to a `failureCategory`. A typed kernel-failure family
 * member exposes its own `category` discriminant (KD-5); anything else is an `in-block`
 * fallback (the engine's only other reject would be a programming error, surfaced as a category
 * rather than an un-typed crash).
 */
function categoryOf(error: unknown): KernelFailureCategory {
  if (error && typeof error === 'object' && 'category' in error) {
    const category = (error as { category: unknown }).category
    if (
      category === 'missing-kernel' ||
      category === 'kernel-launch' ||
      category === 'kernel-died' ||
      category === 'in-block'
    ) {
      return category
    }
  }
  return 'in-block'
}
