import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CreateServerOptions, RuntimeServer, ServerSession } from '@deepnote/runtime-server'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetOutputConfig } from '../output'
import { createServeAction, type ServeDeps, type ServeOptions } from './serve'

/**
 * Suite 6 (mocked). These tests exercise the assembled `createServeAction` against fakes for the
 * server, session, port finder, and browser — **no real socket bind and no real kernel**. The real
 * end-to-end serve smoke (`deepnote serve fixture.deepnote --no-open` answering `GET /api/project`)
 * is the step-5 integration card (`wd2nil`), not here.
 */

// A real, resolvable .deepnote file so `resolvePathToDeepnoteFile` succeeds. Anchored to this test
// file's own location (not `process.cwd()`) so the suite passes regardless of the cwd vitest is
// invoked from — mirroring the `dirname(fileURLToPath(import.meta.url))` pattern used below.
const TEST_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(TEST_DIR, '..', '..', '..', '..')
const HELLO_WORLD_FILE = resolve(REPO_ROOT, 'examples', '1_hello_world.deepnote')

/** Record of every `listen(port, host)` call the action made on the fake server. */
interface ListenCall {
  port: number
  host?: string
}

/** A harness wiring the action to fully-faked deps and exposing the spies + a SIGINT trigger. */
interface Harness {
  deps: ServeDeps
  sessionClose: Mock<() => Promise<void>>
  serverClose: Mock<() => Promise<void>>
  listenCalls: ListenCall[]
  openBrowser: Mock<(url: string) => Promise<void>>
  /** Fire the registered SIGINT handler (the action blocks until this runs). */
  triggerSigint: () => void
  /** Resolve once the action has registered its SIGINT handler. */
  waitForSigintHandler: () => Promise<void>
}

/**
 * Build the harness.
 * @param findPortResult - the port the fake finder returns (models a fallback to a different port).
 * @param listenResult - the port the fake `listen` resolves with (the actually-bound port; may
 *   differ from the requested port to model the OS picking another).
 */
function makeHarness(opts: { findPortResult: number; listenResult: number }): Harness {
  const sessionClose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const serverClose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const listenCalls: ListenCall[] = []
  const openBrowser = vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined)

  let sigintHandler: (() => void) | undefined

  // `serve` only drives `session.close()` (via the server's close → engine.stop()); the rest of
  // the `ServerSession` surface (apiProject/startEngine/runProject/save) is the server's concern,
  // not the command's, so those are guard stubs that throw if the thin action ever touches them.
  const session: ServerSession = {
    close: sessionClose,
    apiProject: () => {
      throw new Error('serve must not call session.apiProject')
    },
    startEngine: () => {
      throw new Error('serve must not call session.startEngine')
    },
    runProject: () => {
      throw new Error('serve must not call session.runProject')
    },
    save: () => {
      throw new Error('serve must not call session.save')
    },
  }

  const server: RuntimeServer = {
    listen: vi.fn((port: number, host?: string) => {
      listenCalls.push({ port, host })
      // The fake server closes the session on close(), exactly like the real one
      // (createServer's close() → session.close() → engine.stop()).
      return Promise.resolve(opts.listenResult)
    }),
    boundAddress: vi.fn(() => '127.0.0.1'),
    close: vi.fn(async () => {
      await sessionClose()
      await serverClose()
    }),
  }

  const deps: ServeDeps = {
    findPort: vi.fn(async () => opts.findPortResult),
    createSession: vi.fn(async () => session),
    createServer: vi.fn((_options: CreateServerOptions) => server),
    openBrowser,
    onSigint: handler => {
      sigintHandler = handler
    },
  }

  return {
    deps,
    sessionClose,
    serverClose,
    listenCalls,
    openBrowser,
    triggerSigint: () => {
      if (!sigintHandler) {
        throw new Error('SIGINT handler was never registered')
      }
      sigintHandler()
    },
    waitForSigintHandler: async () => {
      // The action does async work (resolve path, load session, find port, bind) before it
      // registers the SIGINT handler. Poll until it appears, bounded by a WALL-CLOCK deadline
      // rather than a fixed `setImmediate` tick budget: under heavy parallel load (the full suite),
      // a fixed tick count can be starved before the real-fs path resolve completes, producing a
      // spurious "handler never registered". A short timer yield + deadline is load-tolerant.
      const deadline = Date.now() + 5000
      while (!sigintHandler && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2))
      }
      if (!sigintHandler) {
        throw new Error('SIGINT handler was never registered')
      }
    },
  }
}

/**
 * Run the action to completion. The action blocks on SIGINT, so we fire it on the next tick and
 * await the returned promise. Resolves once the (faked) shutdown finishes.
 */
async function runAction(
  action: (path: string | undefined, options: ServeOptions) => Promise<void>,
  path: string | undefined,
  options: ServeOptions,
  harness: Harness
): Promise<void> {
  const done = action(path, options)
  // Wait until the action has registered its SIGINT handler (after path resolve + bind), then interrupt.
  await harness.waitForSigintHandler()
  harness.triggerSigint()
  await done
}

function getOutput(logSpy: Mock<typeof console.log>): string {
  return logSpy.mock.calls.map(call => call.join(' ')).join('\n')
}

describe('serve command (mocked, suite 6)', () => {
  let program: Command
  let consoleSpy: Mock<typeof console.log>
  let consoleErrorSpy: Mock<typeof console.error>
  let exitSpy: Mock<typeof process.exit>

  beforeEach(() => {
    program = new Command()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as Mock<typeof console.log>
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as Mock<typeof console.error>
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never) as Mock<typeof process.exit>
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetOutputConfig()
  })

  it('binds localhost (127.0.0.1), never 0.0.0.0', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false }, harness)

    expect(harness.listenCalls).toHaveLength(1)
    expect(harness.listenCalls[0].host).toBe('127.0.0.1')
    expect(harness.listenCalls[0].host).not.toBe('0.0.0.0')
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('falls back to the next free port and reports the actually-bound URL', async () => {
    // The finder returns 8090 (8080 was taken); the bind resolves with 8090 too.
    const harness = makeHarness({ findPortResult: 8090, listenResult: 8090 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false }, harness)

    expect(harness.deps.findPort).toHaveBeenCalledWith(8080)
    expect(harness.listenCalls[0].port).toBe(8090)
    // The reported URL reflects the bound port, not the originally-requested one.
    expect(getOutput(consoleSpy)).toContain('http://localhost:8090')
  })

  it('reports the actually-bound port even when listen() resolves a different one', async () => {
    // findPort suggests 8080 but the OS binds 8081 (race with another process between probe + bind).
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8081 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false }, harness)

    expect(getOutput(consoleSpy)).toContain('http://localhost:8081')
    expect(getOutput(consoleSpy)).not.toContain('http://localhost:8080')
  })

  it('--no-open is headless: no browser is launched', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    // commander represents --no-open as { open: false }.
    await runAction(action, HELLO_WORLD_FILE, { open: false }, harness)

    expect(harness.openBrowser).not.toHaveBeenCalled()
  })

  it('opens a browser at the served URL when open is requested', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: true }, harness)

    expect(harness.openBrowser).toHaveBeenCalledTimes(1)
    expect(harness.openBrowser).toHaveBeenCalledWith('http://localhost:8080')
  })

  it('Ctrl-C (SIGINT) closes the server, which stops the engine (session.close)', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false }, harness)

    // server.close() → session.close() → engine.stop(): no orphaned kernel process.
    expect(harness.serverClose).toHaveBeenCalledTimes(1)
    expect(harness.sessionClose).toHaveBeenCalledTimes(1)
  })

  it('passes the loaded session into createServer', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false }, harness)

    expect(harness.deps.createSession).toHaveBeenCalledTimes(1)
    const createServerArg = (harness.deps.createServer as Mock).mock.calls[0][0] as CreateServerOptions
    expect(createServerArg.session).toBeDefined()
  })

  it('threads --port through as the start port for probing', async () => {
    const harness = makeHarness({ findPortResult: 3000, listenResult: 3000 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false, port: '3000' }, harness)

    expect(harness.deps.findPort).toHaveBeenCalledWith(3000)
  })

  it('threads --python / --kernel into the session', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    await runAction(action, HELLO_WORLD_FILE, { open: false, python: '/usr/bin/python3', kernel: 'python3' }, harness)

    expect(harness.deps.createSession).toHaveBeenCalledWith(HELLO_WORLD_FILE, {
      python: '/usr/bin/python3',
      kernel: 'python3',
    })
  })

  it('rejects an invalid --port with a usage error (exit 2)', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    // No SIGINT needed: the bad port throws before the server blocks.
    await action(HELLO_WORLD_FILE, { open: false, port: 'not-a-port' })

    expect(exitSpy).toHaveBeenCalledWith(2)
    expect(harness.deps.findPort).not.toHaveBeenCalled()
  })

  it('exits 2 when the file cannot be resolved', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps)

    await action(resolve(REPO_ROOT, 'does-not-exist.deepnote'), { open: false })

    expect(exitSpy).toHaveBeenCalledWith(2)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  // ── serve default posture ──────────────────────────────────────────────────────────────────────
  // In real commander, serve registers BOTH --open and --no-open, so `options.open` is `undefined`
  // when the user passes neither. The action must resolve that to serve's HEADLESS default — not
  // open a browser. (A lone --no-open would make commander default open=true, the bug this guards.)
  it('serve defaults to headless: open=undefined does NOT launch a browser', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps, { defaultOpen: false })

    // No --open / --no-open flag → commander leaves `open` undefined.
    await runAction(action, HELLO_WORLD_FILE, {}, harness)

    expect(harness.openBrowser).not.toHaveBeenCalled()
  })

  it('serve --open overrides the headless default and opens the local URL', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const action = createServeAction(program, harness.deps, { defaultOpen: false })

    await runAction(action, HELLO_WORLD_FILE, { open: true }, harness)

    expect(harness.openBrowser).toHaveBeenCalledTimes(1)
    expect(harness.openBrowser).toHaveBeenCalledWith('http://localhost:8080')
  })
})

/**
 * The `deepnote ui` alias (Phase 7). `ui` is a THIN alias: it reuses `createServeAction` with
 * `defaultOpen: true` and never duplicates serve logic. These tests pin the load-bearing behavior:
 * `ui` opens the browser at the LOCAL served URL by default; `serve` does not; and no `ui` path
 * reaches the cloud-upload code — the local-first guarantee.
 */
describe('ui alias (mocked, Phase 7)', () => {
  let program: Command
  let consoleErrorSpy: Mock<typeof console.error>
  let exitSpy: Mock<typeof process.exit>

  beforeEach(() => {
    program = new Command()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as Mock<typeof console.error>
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never) as Mock<typeof process.exit>
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetOutputConfig()
  })

  // ── Capstone ─────────────────────────────────────────────────────────────────────────────────
  it('CAPSTONE: ui opens the browser at the LOCAL served URL by default (open undefined)', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const uiAction = createServeAction(program, harness.deps, { defaultOpen: true })

    // No --open / --no-open → commander leaves `open` undefined; ui's default opens a browser.
    await runAction(uiAction, HELLO_WORLD_FILE, {}, harness)

    expect(harness.openBrowser).toHaveBeenCalledTimes(1)
    const openedUrl = harness.openBrowser.mock.calls[0][0]
    // The opened URL is the LOCAL loopback URL — never a cloud URL.
    expect(openedUrl).toBe('http://localhost:8080')
    expect(openedUrl).toMatch(/^http:\/\/localhost:\d+$/)
    expect(openedUrl).not.toMatch(/deepnote\.com|app\.deepnote|https:\/\//)
  })

  it('CAPSTONE: serve does NOT open a browser by default while ui does (same action, flipped default)', async () => {
    // serve: defaultOpen false, open undefined → headless.
    const serveHarness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const serveAction = createServeAction(program, serveHarness.deps, { defaultOpen: false })
    await runAction(serveAction, HELLO_WORLD_FILE, {}, serveHarness)
    expect(serveHarness.openBrowser).not.toHaveBeenCalled()

    // ui: defaultOpen true, open undefined → opens local URL.
    const uiHarness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const uiAction = createServeAction(program, uiHarness.deps, { defaultOpen: true })
    await runAction(uiAction, HELLO_WORLD_FILE, {}, uiHarness)
    expect(uiHarness.openBrowser).toHaveBeenCalledTimes(1)
    expect(uiHarness.openBrowser).toHaveBeenCalledWith('http://localhost:8080')
  })

  it('ui --no-open overrides the default and stays headless', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const uiAction = createServeAction(program, harness.deps, { defaultOpen: true })

    // commander represents --no-open as { open: false } — an explicit override of ui's default.
    await runAction(uiAction, HELLO_WORLD_FILE, { open: false }, harness)

    expect(harness.openBrowser).not.toHaveBeenCalled()
  })

  it('ui opens the actually-bound port (reports the real URL after a port fallback)', async () => {
    // findPort suggests 8080 but the OS binds 8090 — ui must open the bound URL, not the requested one.
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8090 })
    const uiAction = createServeAction(program, harness.deps, { defaultOpen: true })

    await runAction(uiAction, HELLO_WORLD_FILE, {}, harness)

    expect(harness.openBrowser).toHaveBeenCalledWith('http://localhost:8090')
  })

  it('ui still binds localhost (127.0.0.1), never 0.0.0.0', async () => {
    const harness = makeHarness({ findPortResult: 8080, listenResult: 8080 })
    const uiAction = createServeAction(program, harness.deps, { defaultOpen: true })

    await runAction(uiAction, HELLO_WORLD_FILE, {}, harness)

    expect(harness.listenCalls[0].host).toBe('127.0.0.1')
    expect(harness.listenCalls[0].host).not.toBe('0.0.0.0')
    expect(exitSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})

/**
 * Load-bearing NEGATIVE capstone (static guarantee): the serve/ui command module must NOT reference
 * the cloud-upload path `openDeepnoteFileInCloud` (run.ts). `ui` opens the LOCAL URL only; reaching
 * the cloud-upload code would violate the local-first guarantee. We assert this by source inspection
 * because it is a structural invariant — the module simply does not import or call that symbol.
 */
describe('ui local-first guarantee (no cloud-upload path reachable)', () => {
  it('serve.ts never imports or calls openDeepnoteFileInCloud (the cloud-upload path)', () => {
    // Read the command module source and assert the cloud-upload path is neither imported nor
    // invoked. We strip comments first so that prose mentioning the symbol (the local-first rationale)
    // does not count — only real code (an import binding or a call expression) is a violation.
    // (Read via the runtime fs so the check tracks the actual shipped file, not a snapshot.)
    const here = dirname(fileURLToPath(import.meta.url))
    const rawSource = readFileSync(resolve(here, 'serve.ts'), 'utf-8')
    const codeOnly = rawSource
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments (incl. JSDoc)
      .replace(/\/\/.*$/gm, '') // line comments

    // No import binding for the cloud-upload symbol.
    expect(codeOnly).not.toMatch(/import[\s\S]*openDeepnoteFileInCloud/)
    // No call expression invoking it.
    expect(codeOnly).not.toMatch(/openDeepnoteFileInCloud\s*\(/)
    // And the module does not pull in run.ts (where the cloud-upload path lives) at all.
    expect(codeOnly).not.toContain('./run')
  })
})
