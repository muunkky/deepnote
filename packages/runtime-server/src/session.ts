/**
 * `Session` — the single opened-project lifecycle for one `deepnote serve` process.
 *
 * **KD-6 split.** Opening a project is pure deserialization + resolution metadata; a
 * viewer (m3/s2) renders persisted outputs with **no kernel running**. So the session
 * splits opening into two phases:
 *
 * - {@link Session.loadProject} — read the on-disk bytes, hash them, deserialize, and
 *   resolve the capability flags. **No kernel side effect.** This backs `GET /api/project`.
 * - `startEngine()` — lazily construct/launch the `ExecutionEngine` on the first run.
 *   Forward-declared here; wired in Phase 3 (`execute-stream-ws`). A missing or
 *   mis-installed kernel surfaces on *run* as a typed `KernelFailureCategory`, never as
 *   an open failure — which is exactly what `loadProject` staying kernel-free guarantees.
 *
 * Holding the loaded project + `openHash` in the session (not re-reading per request) is
 * the design-doc caching strategy: the open payload is captured once at open time and the
 * `openHash` is echoed back on save for optimistic-concurrency (KD-7, Phase 4B).
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import type { DeepnoteBlock, DeepnoteFile } from '@deepnote/blocks'
import { deserializeDeepnoteFile } from '@deepnote/blocks'
import {
  type BlockExecutionResult,
  ExecutionEngine,
  type ExecutionSummary,
  type IOutput,
  isNonPythonKernel,
  KernelDiedError,
  type KernelFailureCategory,
  KernelLaunchError,
  KernelNotRegisteredError,
  resolvePythonExecutable,
  selectKernelName,
  selectPythonSpec,
} from '@deepnote/runtime-core'
import type { ApiProject, SaveProjectRequest } from './api-types'
import { type SaveResult, saveProject } from './save'

/** Options for opening a project into a {@link Session}. */
export interface LoadProjectOptions {
  /**
   * Explicit kernelspec name (`--kernel`), threaded into the ADR-003 selector. When
   * absent the kernel resolves to the `python3` default. Capability resolution is
   * **name-based** in s1 (no kernel launched), mirroring `run.ts`.
   */
  kernel?: string
  /**
   * Explicit Python interpreter (`--python`), threaded into the ADR-001 selector. When
   * absent it resolves via the shared `selectPythonSpec` precedence. Used only to detect
   * a *mis-installed* interpreter for the capability flag — it is never executed here.
   */
  python?: string
}

/**
 * The KD-6 capability flags, resolved at open time **without launching a kernel**.
 *
 * - `kernelLanguage`: `'python'` for the `python3` default; the resolved kernel name for
 *   an explicit non-Python kernel; `null` when the interpreter is missing/mis-installed
 *   (the "kernel missing" UI state — surfaced as a flag, not an open failure).
 * - `reactivity`: always `'disabled'` in s1. Reactive execution is **not wired** until the
 *   reactivity story (m3/s5) builds upstream resolution on the public `@deepnote/reactivity`
 *   primitives (design-doc B3 / Open Questions). The `'python'` value of this flag activates
 *   only then; emitting it now would advertise a capability that does not exist.
 */
type Capabilities = ApiProject['capabilities']

/**
 * Resolve the capability flags for a project open, kernel-free (KD-6).
 *
 * The kernel axis (ADR-003 `selectKernelName`) and interpreter axis (ADR-001
 * `selectPythonSpec` / `resolvePythonExecutable`) are orthogonal, exactly as `run.ts`
 * composes them. We only *probe* the interpreter (does the path resolve?) — we never run
 * it and we never start a kernel. A missing interpreter degrades `kernelLanguage` to
 * `null`; it does **not** fail the open.
 */
async function resolveCapabilities(options: LoadProjectOptions): Promise<Capabilities> {
  const kernelName = selectKernelName({ explicit: options.kernel })
  const nonPython = isNonPythonKernel(kernelName)

  if (nonPython) {
    // A non-Python kernel reports its own name as the language (s1 is name-based; the
    // kernelspec `language` refinement is Phase 3+). The kernel axis (ADR-003) and the
    // interpreter axis (ADR-001) are orthogonal — bash availability has nothing to do with
    // the Python interpreter — so we do NOT probe Python here. Probing it would let a
    // mis-installed Python wrongly null this flag (the L1 capability-coupling bug).
    return { kernelLanguage: kernelName, reactivity: 'disabled' }
  }

  // Python path only: probe the interpreter without executing it. `resolvePythonExecutable`
  // throws when the path does not exist / holds no python — that is the s1 "mis-installed
  // kernel" signal. A Python kernel with no resolvable interpreter is the "kernel missing"
  // state: render the tree, but flag it (`kernelLanguage: null`). A resolvable interpreter
  // reports `'python'`.
  let interpreterAvailable = true
  try {
    await resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))
  } catch {
    interpreterAvailable = false
  }

  const kernelLanguage = interpreterAvailable ? 'python' : null

  // Reactive execution is an m3/s5 deliverable (design-doc B3): always off in s1.
  const reactivity: Capabilities['reactivity'] = 'disabled'

  return { kernelLanguage, reactivity }
}

/**
 * Compute the stable `openHash` — a hex SHA-256 of the exact on-disk bytes at open time.
 * Hashing the raw bytes (not the deserialized object) makes it byte-exact and stable:
 * the same bytes in always produce the same hash, and it is the value compared against the
 * current on-disk hash at save time for external-change detection (KD-7).
 */
function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * A loaded project: the deserialized file, the bytes' hash, the absolute path, the resolved
 * capability flags, and the load options (threaded into {@link Session.startEngine} to resolve
 * the engine config). Held in the {@link Session}; not re-read per request.
 */
interface LoadedProject {
  path: string
  file: DeepnoteFile
  openHash: string
  capabilities: Capabilities
  options: LoadProjectOptions
}

/**
 * A typed kernel-start failure carrying the design-doc {@link KernelFailureCategory} (R5). The
 * `/…/run` route reads `.failureCategory` to build the HTTP error payload
 * (`{ error, failureCategory }`) or the terminal WS `run-failed`, rather than re-deriving the
 * class from a stringified message (KD-5). Raised by {@link Session.startEngine} when the
 * underlying `engine.start()` throws a typed kernel-failure-family member.
 */
export class StartEngineError extends Error {
  constructor(
    readonly failureCategory: KernelFailureCategory,
    message: string
  ) {
    super(message)
    this.name = 'StartEngineError'
  }
}

/** The subset of engine callbacks {@link Session.runProject} forwards. */
export interface RunProjectCallbacks {
  onBlockStart: (block: DeepnoteBlock, index: number, total: number) => void | Promise<void>
  onBlockDone: (result: BlockExecutionResult) => void | Promise<void>
  onOutput: (blockId: string, output: IOutput) => void
}

/** The per-run request {@link Session.runProject} executes (s1: single-block or run-all). */
export interface RunProjectRequest {
  blockId?: string
  notebookName?: string
}

/**
 * The session surface the {@link createServer} host depends on — the route + queue collaborators
 * (`apiProject`, `startEngine`, `runProject`, `close`). {@link Session} implements it. Declared
 * as an interface (not the concrete class) so the server is decoupled from the engine wiring and
 * the HTTP/WS layer is unit-testable with a fake session — no real kernel required. 4B's `save`
 * surface extends this additively.
 */
export interface ServerSession {
  apiProject(): ApiProject
  startEngine(): Promise<void>
  runProject(request: RunProjectRequest, callbacks: RunProjectCallbacks): Promise<ExecutionSummary>
  /**
   * Persist a project back to the opened file atomically, guarding against external changes
   * (4B — the save-safety gate). Returns a discriminated {@link SaveResult}: a committed write
   * (the route maps to `200 { savedHash, bytesWritten }`) or a refused external-change conflict
   * (mapped to `409 { error:'external-change', currentProject, currentHash }`, **no write**). On a
   * committed write the session adopts `savedHash` as its new `openHash` so an immediate re-save
   * by the same client is a no-op rather than a false conflict.
   */
  save(request: SaveProjectRequest): Promise<SaveResult>
  close(): Promise<void>
}

/**
 * The opened-project lifecycle for one serve process.
 *
 * In s1 the session owns the loaded project (this card) and will own the lazily-started
 * `ExecutionEngine` (Phase 3). Construct it, `loadProject(path)` once, then serve
 * `GET /api/project` from the held state via {@link Session.apiProject}.
 */
export class Session implements ServerSession {
  #loaded: LoadedProject | null = null
  /**
   * The lazily-started engine (KD-6 `startEngine` half). `null` until the first run triggers
   * {@link Session.startEngine}; constructed/launched once, then reused across runs (KD-1 — one
   * engine per serve process, not per request).
   */
  #engine: ExecutionEngine | null = null

  /**
   * Open a `.deepnote` file: read its bytes, hash them, deserialize, and resolve the
   * capability flags — **no kernel is started** (KD-6). Throws on an unreadable path or
   * an invalid file (the caller maps that to a `400`). Idempotent: re-opening replaces the
   * held state with a freshly-read snapshot (and a fresh `openHash`).
   */
  async loadProject(projectPath: string, options: LoadProjectOptions = {}): Promise<void> {
    const absolutePath = isAbsolute(projectPath) ? projectPath : resolve(projectPath)
    const bytes = await readFile(absolutePath)
    // Deserialize from the decoded text so a malformed file throws here (→ 400), before any
    // capability probing. The hash is over the raw bytes for byte-exact stability.
    const file = deserializeDeepnoteFile(bytes.toString('utf8'))
    const capabilities = await resolveCapabilities(options)

    this.#loaded = {
      path: absolutePath,
      file,
      openHash: hashBytes(bytes),
      capabilities,
      options,
    }
  }

  /**
   * Lazily construct + launch the single {@link ExecutionEngine} (the `startEngine` half of the
   * KD-6 split) and connect its kernel. Idempotent: the first call starts the engine; later calls
   * reuse it. A missing / unlaunchable / dead-at-launch kernel surfaces here — **on run** — as a
   * typed {@link StartEngineError} carrying the design-doc {@link KernelFailureCategory} (R5),
   * never as an open failure (KD-6). The discriminant is read from the typed kernel-failure-family
   * instance `engine.start()` throws (KD-5), exactly as `run.ts` preserves it.
   */
  async startEngine(): Promise<void> {
    if (this.#engine) {
      return
    }
    const loaded = this.#requireLoaded()
    const engine = new ExecutionEngine({
      // The interpreter that runs the toolkit server (ADR-001 precedence); resolved name-based at
      // open time, resolved to a real path here. A mis-installed interpreter throws below.
      pythonEnv: selectPythonSpec({ explicit: loaded.options.python }),
      // Runs resolve relative paths against the project's own directory, mirroring `deepnote run`.
      workingDirectory: dirname(loaded.path),
      // The kernelspec the toolkit server launches (ADR-003); defaults to `python3`.
      kernelName: selectKernelName({ explicit: loaded.options.kernel }),
    })
    try {
      await engine.start()
    } catch (error) {
      // KD-5: preserve the typed discriminant. `engine.start()` rethrows the kernel-failure-family
      // member (missing/launch/died); map it to the design-doc category for the route's payload.
      const failureCategory: KernelFailureCategory =
        error instanceof KernelNotRegisteredError
          ? 'missing-kernel'
          : error instanceof KernelLaunchError
            ? 'kernel-launch'
            : error instanceof KernelDiedError
              ? 'kernel-died'
              : 'kernel-launch'
      throw new StartEngineError(failureCategory, error instanceof Error ? error.message : String(error))
    }
    this.#engine = engine
  }

  /**
   * Run the opened project against the started engine, forwarding the engine callbacks. A thin
   * pass-through to `engine.runProject` (design doc KD-1) — **called only by `run-queue.ts`'s
   * `drain`** (the M2 invariant), never directly by a route, so no un-serialized run can exist.
   * Resolves with the {@link ExecutionSummary} (incl. an in-block break, `failedBlocks > 0`, which
   * resolves — B1); rejects with a {@link KernelDiedError} on mid-run kernel death (the only reject
   * path, KD-5). Requires {@link Session.startEngine} to have run first.
   */
  async runProject(request: RunProjectRequest, callbacks: RunProjectCallbacks): Promise<ExecutionSummary> {
    const engine = this.#engine
    if (!engine) {
      throw new Error('Engine not started; call startEngine() first.')
    }
    const loaded = this.#requireLoaded()
    return engine.runProject(loaded.file, {
      notebookName: request.notebookName,
      blockId: request.blockId,
      onBlockStart: callbacks.onBlockStart,
      onBlockDone: callbacks.onBlockDone,
      onOutput: callbacks.onOutput,
    })
  }

  /**
   * Persist a project back to the opened file (4B). Delegates the atomic temp-then-rename write +
   * external-change detection to {@link saveProject}, writing to the session's own loaded `path` and
   * comparing the request's `openHash` against the current on-disk bytes. On a committed write the
   * session **adopts `savedHash` as its new `openHash`** — so the same client can re-save its own
   * just-saved canonical bytes without tripping the conflict guard against itself. On a conflict the
   * `openHash` is left unchanged (no write happened). Throws if no project is loaded.
   */
  async save(request: SaveProjectRequest): Promise<SaveResult> {
    const loaded = this.#requireLoaded()
    const result = await saveProject(loaded.path, request.project, request.openHash)
    if (!result.conflict) {
      loaded.openHash = result.savedHash
    }
    return result
  }

  /** Stop the engine and release the kernel/server (the `serve` SIGINT path). Idempotent. */
  async close(): Promise<void> {
    if (this.#engine) {
      await this.#engine.stop()
      this.#engine = null
    }
  }

  /** The captured `openHash`, for save-time external-change detection (Phase 4B). */
  get openHash(): string {
    return this.#requireLoaded().openHash
  }

  /**
   * Build the `GET /api/project` response from the held state. The `metadata`/`project`
   * fields are the *same* objects produced by {@link deserializeDeepnoteFile}, so the
   * payload deep-equals a direct deserialization of the same bytes (persisted outputs
   * intact) — the capstone invariant.
   */
  apiProject(): ApiProject {
    const loaded = this.#requireLoaded()
    return {
      path: loaded.path,
      metadata: loaded.file.metadata,
      project: loaded.file.project,
      openHash: loaded.openHash,
      capabilities: loaded.capabilities,
    }
  }

  #requireLoaded(): LoadedProject {
    if (!this.#loaded) {
      throw new Error('Session has no loaded project; call loadProject() first.')
    }
    return this.#loaded
  }
}
