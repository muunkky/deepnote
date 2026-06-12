/**
 * `@deepnote/runtime-server/types` — the canonical s1 ↔ SPA wire contract.
 *
 * This module is the **single source of truth** for the HTTP/WS shapes that the
 * `deepnote serve` backend and the m3/s2 SPA viewer exchange (ADR-007 §6, design
 * doc Interface Design). Per ADR-007 §6 it contains **only** `type`/`interface`
 * declarations and **only `import type`** references — it must have **zero runtime
 * import** so a type-only consumer (the SPA) can `import type { ApiProject,
 * WsClientMessage, WsServerEvent } from '@deepnote/runtime-server/types'` without
 * dragging Node, HTTP, or the `ws` library into its type graph. A dependency check
 * (`api-types-no-runtime-import.test.ts`) asserts this invariant behaviourally; a
 * consumer that hand-redeclares these shapes defeats the compile-time drift catch
 * and is a design violation.
 *
 * The drift-catch only holds while consumers import these identifiers and build
 * their view-models on top of them rather than re-declaring a local shape.
 *
 * @packageDocumentation
 */

import type { DeepnoteFile } from '@deepnote/blocks'
import type { IOutput, KernelFailureCategory } from '@deepnote/runtime-core'

// Re-export the helper discriminant so a `/types` consumer gets the full contract
// from one entry without reaching into `@deepnote/runtime-core` directly.
export type { KernelFailureCategory } from '@deepnote/runtime-core'

/**
 * Monotonic per-server run identifier. Every {@link WsServerEvent} carries it so a
 * consumer attributes streamed events to the originating run unambiguously.
 */
export type RunId = number

/**
 * `GET /api/project` response payload — the full opened-file envelope.
 *
 * Requires no kernel (viewer-friendly): the persisted notebook/block tree, its
 * metadata, the on-disk hash captured at open time (echoed back on save for
 * optimistic-concurrency), and the capability flags that drive the KD-6
 * "kernel missing" UI state.
 */
export interface ApiProject {
  /** Absolute path of the opened file. */
  path: string
  /** File-level metadata, identical to the persisted `DeepnoteFile['metadata']`. */
  metadata: DeepnoteFile['metadata']
  /** The full notebook/block tree, with persisted outputs intact. */
  project: DeepnoteFile['project']
  /** SHA-256 of the on-disk bytes at open time; echoed back on save. */
  openHash: string
  /** Server capabilities the viewer branches on (KD-6). */
  capabilities: {
    /** The resolved kernel language, or `null` when no kernel is available. */
    kernelLanguage: string | null
    /** Whether reactive execution is wired (`'python'`) or off (`'disabled'`). */
    reactivity: 'python' | 'disabled'
  }
}

/**
 * `POST /api/project/save` request body (step 4B — the save-safety gate).
 *
 * The client echoes the `openHash` it received from {@link ApiProject} at open time; the
 * server compares it against a fresh SHA-256 of the on-disk bytes to detect an external
 * change since open (KD-7). `project` is the full file to persist — the serializer
 * re-canonicalizes it (sorting keys, field order) so fidelity is **semantic**, not
 * byte-level (design doc "Save round-trip (R6)").
 */
export interface SaveProjectRequest {
  /** The full project tree + metadata to write back, as a {@link DeepnoteFile}. */
  project: DeepnoteFile
  /** The `openHash` echoed from {@link ApiProject}; the optimistic-concurrency token. */
  openHash: string
}

/**
 * `POST /api/project/save` success response (`200`). The write was atomic
 * (temp-then-rename in the same directory) and the persisted bytes are canonical.
 */
export interface SaveProjectResponse {
  /** SHA-256 of the bytes actually written — the client adopts this as its next `openHash`. */
  savedHash: string
  /** Byte length of the persisted (canonical) YAML. */
  bytesWritten: number
}

/**
 * `POST /api/project/save` conflict response (`409`) — the **no-clobber** guard (KD-7).
 *
 * Returned with **no write performed** when the on-disk SHA-256 no longer equals the
 * request's `openHash` (someone edited the file since it was opened). The current on-disk
 * content is handed back so the client can reconcile rather than lose the other edit.
 */
export interface SaveConflictResponse {
  /** Literal discriminant for the external-change conflict. */
  error: 'external-change'
  /** The current on-disk project (freshly deserialized) the save would have overwritten. */
  currentProject: DeepnoteFile
  /** SHA-256 of the current on-disk bytes — the client's new optimistic-concurrency token. */
  currentHash: string
}

/**
 * Client → server WS message union.
 *
 * In s1 `runScope` is `'block'` only, and `cancel` cancels a **queued** task
 * (running-cancel is deferred to m3/s5).
 */
export type WsClientMessage =
  | { type: 'run'; blockId?: string; notebookName?: string; runScope?: 'block' }
  | { type: 'cancel'; runId: RunId }

/**
 * A streamed kernel output, attributed to a single block within a run. Mirrors
 * `ExecutionEngine`'s `onOutput(blockId, output)` callback one-to-one.
 *
 * Two shapes, discriminated by {@link OutputEvent.truncated}:
 *
 * - The normal payload carries a single `output: IOutput` (mirrors `onOutput`).
 * - The **within-block back-pressure marker** (design doc S1, regime 2) carries
 *   `truncated: true` and **no** `output`: once a single block's runaway `stream`
 *   text exceeds the `wsHighWaterMark` bound (default 8 MiB), the remaining
 *   `stream` text for that block is replaced by exactly one `{ truncated: true }`
 *   marker. Lifecycle/result outputs (`execute_result`/`display_data`/`error`) are
 *   never dropped — only a single block's runaway `stream` is bounded, never
 *   silently.
 */
export type OutputEvent =
  | { type: 'output'; runId: RunId; blockId: string; output: IOutput; truncated?: false }
  | { type: 'output'; runId: RunId; blockId: string; truncated: true }

/**
 * Terminal event for the kernel-death catch (KD-5) — the **only** non-`run-done`
 * terminal. Emitted when the kernel dies at launch or mid-run; after it, no
 * further events arrive for that `runId`.
 */
export interface FailureEvent {
  type: 'run-failed'
  runId: RunId
  failureCategory: KernelFailureCategory
  message: string
}

/**
 * Server → client WS event union (ADR-005, backend-agnostic). Every event carries
 * `runId`. Exactly one terminal event ends every run: the **guaranteed**
 * `run-done` on `engine.runProject` resolve (including an in-block failure, where
 * `failedBlocks > 0`), or the kernel-death-only `run-failed` ({@link FailureEvent}).
 */
export type WsServerEvent =
  | { type: 'run-queued'; runId: RunId; queueDepth: number }
  | { type: 'run-start'; runId: RunId; totalBlocks: number }
  | { type: 'block-start'; runId: RunId; blockId: string; index: number; total: number }
  | OutputEvent
  | {
      type: 'block-done'
      runId: RunId
      blockId: string
      success: boolean
      durationMs: number
      failureCategory?: KernelFailureCategory
    }
  | { type: 'run-done'; runId: RunId; executedBlocks: number; failedBlocks: number }
  | FailureEvent
  | { type: 'run-cancelled'; runId: RunId }
