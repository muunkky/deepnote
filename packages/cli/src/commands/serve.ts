import { findConsecutiveAvailablePorts } from '@deepnote/runtime-core'
import {
  type CreateServerOptions,
  createServer as createRuntimeServer,
  type RuntimeServer,
  type ServerSession,
  Session,
} from '@deepnote/runtime-server'
import type { Command } from 'commander'
import { ExitCode } from '../exit-codes'
import { debug, getChalk, log, error as logError, output } from '../output'
import { openInBrowser } from '../utils/browser'
import { FileResolutionError, resolvePathToDeepnoteFile } from '../utils/file-resolver'
import { getErrorMessage } from '../utils/import-client'

/**
 * The interface (loopback) `serve` binds. **Never `0.0.0.0`.** A `deepnote serve` process
 * fronts a live `ExecutionEngine`; binding the unspecified address would expose a
 * kernel-backed run surface to every host on the network. Loopback keeps it reachable only
 * from the user's own machine — the localhost-trust boundary the docs page calls out.
 */
const BIND_HOST = '127.0.0.1'

/** The port `serve` starts probing from when `--port` is not given. */
const DEFAULT_START_PORT = 8080

/** Options parsed by commander for `deepnote serve` / `deepnote ui`. */
export interface ServeOptions {
  /** Explicit start port (`--port`). When set, probing begins here instead of {@link DEFAULT_START_PORT}. */
  port?: string
  /**
   * Whether to open a browser at the served URL. Commander's `--no-open` sets this to `false`;
   * the `ui` alias (Phase 7) will default it to `true`. Undefined here means "use the command's
   * default", which `serve` resolves to *not* opening (headless).
   */
  open?: boolean
  /** Explicit Python interpreter (`--python`), threaded into the session's ADR-001 resolver. */
  python?: string
  /** Explicit kernelspec name (`--kernel`), threaded into the session's ADR-003 resolver. */
  kernel?: string
  /**
   * Optional path to a built static SPA to serve alongside the API. **Defaults UNSET** and is
   * **never** hard-coded to a bundled app path (ADR-007 §2) — the upstream slice ships no SPA, so
   * a baked-in default would be a dangling reference. The fork launcher supplies this; here it is
   * a pass-through option only, carried so the flag surface is stable across the slice boundary.
   */
  staticDir?: string
}

/**
 * The collaborators {@link createServeAction} depends on, injected so the action can be unit-tested
 * against a fake server + session with **no real kernel and no real socket bind** (suite 6 is
 * mocked; the real serve smoke is step 5). Production defaults wire the real
 * `@deepnote/runtime-server` factory, the real port finder, and the real browser opener.
 */
export interface ServeDeps {
  /** Resolve a free **single** port to bind (see the port-selection note on {@link createServeAction}). */
  findPort: (startPort: number) => Promise<number>
  /** Construct the (already-loaded) session for an opened project path. */
  createSession: (path: string, options: { python?: string; kernel?: string }) => Promise<ServerSession>
  /** Construct the runtime server around a session. */
  createServer: (options: CreateServerOptions) => RuntimeServer
  /** Open the served URL in a browser (the `--open` / `ui` path). */
  openBrowser: (url: string) => Promise<void>
  /** Register a `SIGINT` handler. Defaults to `process.on('SIGINT', …)`; overridable in tests. */
  onSigint: (handler: () => void) => void
}

/** Production wiring for {@link ServeDeps}: the real server, real port finder, real browser opener. */
function defaultServeDeps(): ServeDeps {
  return {
    findPort: findConsecutiveAvailablePorts,
    async createSession(path, options) {
      const session = new Session()
      await session.loadProject(path, { python: options.python, kernel: options.kernel })
      return session
    },
    createServer: createRuntimeServer,
    openBrowser: openInBrowser,
    onSigint(handler) {
      process.on('SIGINT', handler)
    },
  }
}

/**
 * `deepnote serve` — boot a local Node host over a `.deepnote` project.
 *
 * **Thin by design (ADR-007 §2, design-doc Phase 6).** All server logic lives in
 * `@deepnote/runtime-server`; this action only: resolve the file path → pick a single free port →
 * `createServer({ session }).listen(port, '127.0.0.1')` → log the ready URL → optionally open a
 * browser → wire `SIGINT` → `server.close()` (which closes the session, i.e. `engine.stop()`).
 *
 * **Port selection (M1).** {@link ServeDeps.findPort} is `findConsecutiveAvailablePorts`, which
 * returns the **first of a consecutive PAIR** (it was built for the toolkit server's two-port need
 * and steps `attempt*2`, requiring both `p` and `p+1` free). `serve` needs **one** port: it binds
 * the returned `p` and **intentionally leaves `p+1` free** rather than adding a separate single-port
 * finder — reusing the audited helper, accepting that one adjacent port per serve process is left
 * unused. The reported URL reflects the **actually-bound** port (the resolved value from
 * `listen()`), so a fallback to a different port is always reported truthfully.
 *
 * @param deps - injected collaborators; defaults to the real runtime-server wiring.
 */
export function createServeAction(
  _program: Command,
  deps: ServeDeps = defaultServeDeps()
): (path: string | undefined, options: ServeOptions) => Promise<void> {
  return async (path, options) => {
    try {
      await runServe(path, options, deps)
    } catch (error) {
      // File-resolution problems are user-input errors (exit 2); everything else is a runtime error (exit 1).
      const exitCode = error instanceof FileResolutionError ? ExitCode.InvalidUsage : ExitCode.Error
      logError(getErrorMessage(error))
      process.exit(exitCode)
    }
  }
}

/** Boot the server and block until `SIGINT`. Extracted from the action so the try/catch stays thin. */
async function runServe(path: string | undefined, options: ServeOptions, deps: ServeDeps): Promise<void> {
  const c = getChalk()
  const { absolutePath } = await resolvePathToDeepnoteFile(path)

  log(c.dim(`Opening ${absolutePath}...`))
  const session = await deps.createSession(absolutePath, { python: options.python, kernel: options.kernel })

  const server = deps.createServer({ session })

  const startPort = resolveStartPort(options.port)
  const candidatePort = await deps.findPort(startPort)
  // Bind loopback explicitly — never 0.0.0.0. `listen` resolves with the actually-bound port.
  const boundPort = await server.listen(candidatePort, BIND_HOST)

  const url = `http://localhost:${boundPort}`
  output(`${c.green('✓')} deepnote serve ready at ${c.cyan(url)}`)
  log(c.dim('Press Ctrl-C to stop.'))

  if (options.open) {
    debug(`Opening browser at ${url}`)
    // A browser-launch failure must not take the server down — the URL is already printed.
    await deps.openBrowser(url).catch(err => {
      log(c.yellow(`Could not open browser automatically: ${getErrorMessage(err)}`))
      log(c.dim(`Open ${url} manually.`))
    })
  }

  await new Promise<void>(done => {
    deps.onSigint(() => {
      log(c.dim('\nShutting down...'))
      // `server.close()` closes the session, which calls `engine.stop()` — no orphaned kernel.
      void server
        .close()
        .catch(err => logError(`Error during shutdown: ${getErrorMessage(err)}`))
        .finally(() => {
          output(c.dim('Stopped.'))
          // `done` is the Promise executor's resolve (returns void); the explicit `void`
          // keeps biome's per-file lint from misreading it as a floating promise.
          void done()
        })
    })
  })
}

/**
 * Resolve the start port from `--port`. Invalid input is a user error (a clear message, not a
 * silent fallback to the default), matching the rest of the CLI's strict-flag posture.
 */
function resolveStartPort(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_START_PORT
  }
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new FileResolutionError(`Invalid --port value: ${raw}. Expected an integer in 1–65535.`)
  }
  return port
}
