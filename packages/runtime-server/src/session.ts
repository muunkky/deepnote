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
import { isAbsolute, resolve } from 'node:path'
import type { DeepnoteFile } from '@deepnote/blocks'
import { deserializeDeepnoteFile } from '@deepnote/blocks'
import { isNonPythonKernel, resolvePythonExecutable, selectKernelName, selectPythonSpec } from '@deepnote/runtime-core'
import type { ApiProject } from './api-types'

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

  // Probe the interpreter without executing it: `resolvePythonExecutable` throws when the
  // path does not exist / holds no python — that is the s1 "mis-installed kernel" signal.
  let interpreterAvailable = true
  try {
    await resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))
  } catch {
    interpreterAvailable = false
  }

  // A Python kernel with no resolvable interpreter is the "kernel missing" state: render
  // the tree, but flag it (`kernelLanguage: null`). A non-Python kernel reports its own
  // name as the language (s1 is name-based; the kernelspec `language` refinement is Phase
  // 3+). A resolvable Python interpreter reports `'python'`.
  const kernelLanguage = interpreterAvailable ? (nonPython ? kernelName : 'python') : null

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
 * A loaded project: the deserialized file, the bytes' hash, the absolute path, and the
 * resolved capability flags. Held in the {@link Session}; not re-read per request.
 */
interface LoadedProject {
  path: string
  file: DeepnoteFile
  openHash: string
  capabilities: Capabilities
}

/**
 * The opened-project lifecycle for one serve process.
 *
 * In s1 the session owns the loaded project (this card) and will own the lazily-started
 * `ExecutionEngine` (Phase 3). Construct it, `loadProject(path)` once, then serve
 * `GET /api/project` from the held state via {@link Session.apiProject}.
 */
export class Session {
  #loaded: LoadedProject | null = null

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
