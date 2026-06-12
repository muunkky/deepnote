import { resolve } from 'node:path'
import type { CreateServerOptions, RuntimeServer } from '@deepnote/runtime-server'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetOutputConfig } from '../output'
import { createServeAction, type ServeDeps, type ServeOptions, type SessionLike } from './serve'

/**
 * Suite 6 (mocked). These tests exercise the assembled `createServeAction` against fakes for the
 * server, session, port finder, and browser — **no real socket bind and no real kernel**. The real
 * end-to-end serve smoke (`deepnote serve fixture.deepnote --no-open` answering `GET /api/project`)
 * is the step-5 integration card (`wd2nil`), not here.
 */

// A real, resolvable .deepnote file so `resolvePathToDeepnoteFile` succeeds (tests run from root).
const HELLO_WORLD_FILE = resolve(process.cwd(), 'examples', '1_hello_world.deepnote')

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

  const session: SessionLike = { close: sessionClose }

  const server: RuntimeServer = {
    listen: vi.fn((port: number, host?: string) => {
      listenCalls.push({ port, host })
      // The fake server closes the session on close(), exactly like the real one
      // (createServer's close() → session.close() → engine.stop()).
      return Promise.resolve(opts.listenResult)
    }),
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
      // registers the SIGINT handler. Poll the microtask/macrotask queue until it appears.
      for (let i = 0; i < 1000 && !sigintHandler; i++) {
        await new Promise(r => setImmediate(r))
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

    await action(resolve(process.cwd(), 'does-not-exist.deepnote'), { open: false })

    expect(exitSpy).toHaveBeenCalledWith(2)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
