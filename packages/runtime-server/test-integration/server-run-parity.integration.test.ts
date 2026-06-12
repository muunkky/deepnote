import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { networkInterfaces, tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { IOutput } from '@deepnote/runtime-core'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import type { WsServerEvent } from '../src/api-types'
import { createServer, type RuntimeServer } from '../src/server'
import { Session } from '../src/session'

/**
 * Step-5 server ↔ `deepnote run` integration parity suite (card `wd2nil`, design-doc
 * suites 1 & 5, Phase 5 DoD). The wedge's headline proof: "the server runs your project
 * exactly the way `deepnote run` does." These tests boot the REAL `@deepnote/runtime-server`
 * over a real `Session` (real toolkit kernel) AND drive the REAL built CLI
 * (`packages/cli/dist/bin.js`) on the same fixture, then assert the streamed `IOutput`s
 * deep-equal the CLI's.
 *
 * Collected ONLY by `vitest.integration.config.ts` (the default `vitest.config.ts` excludes
 * the `*.integration.test.ts` glob — KD-9) and run ONLY in the `integration-kernels` CI job,
 * which provisions the Python venv (`deepnote-toolkit[server]` + `bash_kernel`).
 *
 * Gating (defense-in-depth): every test self-SKIPS — never hard-fails — when
 * `RUN_INTEGRATION_TESTS` is unset, or when the built CLI / provisioned venv cannot be found.
 * So a contributor without Python who runs `pnpm test:integration` directly gets skips, not red.
 * The `exclude` glob, not this gate, is what keeps these out of the always-on mocked `pnpm test`.
 */

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/runtime-server/test-integration -> repo root
const repoRoot = resolve(here, '..', '..', '..')
const cliBin = join(repoRoot, 'packages', 'cli', 'dist', 'bin.js')

/**
 * Resolve the integration venv root. CI sets `DEEPNOTE_INTEGRATION_VENV` (or uses the default
 * `.venv` at repo root) after provisioning `deepnote-toolkit[server]`. The `Session` resolves
 * `bin/python` under the root via `selectPythonSpec({ explicit })`.
 */
function resolveVenv(): string | null {
  const explicit = process.env.DEEPNOTE_INTEGRATION_VENV
  const candidates = explicit ? [explicit] : [join(repoRoot, '.venv')]
  for (const candidate of candidates) {
    const root = resolve(candidate)
    if (existsSync(join(root, 'bin', 'python')) || existsSync(join(root, 'Scripts', 'python.exe'))) {
      return root
    }
  }
  return null
}

const venv = resolveVenv()
const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === 'true' && venv !== null && existsSync(cliBin)
const describeIntegration = integrationEnabled ? describe : describe.skip

const sourceFixtures = join(here, 'fixtures')
const paritySource = join(sourceFixtures, 'server-run-parity.deepnote')
const kernelDeathSource = join(sourceFixtures, 'server-kernel-death.deepnote')

// The CLI's `run` persists an execution snapshot into a `snapshots/` dir NEXT TO the source
// file. Copy fixtures into a throwaway temp dir and run from there so those artifacts never
// touch the repo working tree (or CI's `git status`). The server side reads the same copies.
let workDir = ''
let parityFixture = ''
let kernelDeathFixture = ''

beforeAll(() => {
  // Surface why the suite is (or isn't) running so a CI skip is never silent.
  // biome-ignore lint/suspicious/noConsole: integration diagnostics belong on the CI log.
  console.log(`[integration] RUN_INTEGRATION_TESTS=${process.env.RUN_INTEGRATION_TESTS} venv=${venv} cliBin=${cliBin}`)
  if (!integrationEnabled) {
    return
  }
  workDir = mkdtempSync(join(tmpdir(), 'deepnote-server-parity-'))
  parityFixture = join(workDir, basename(paritySource))
  kernelDeathFixture = join(workDir, basename(kernelDeathSource))
  copyFileSync(paritySource, parityFixture)
  copyFileSync(kernelDeathSource, kernelDeathFixture)
})

afterAll(() => {
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true })
  }
})

// Each test boots its own server; tear it down after every test so a failing assertion
// never leaks a live kernel into the next test.
let server: RuntimeServer | null = null
afterEach(async () => {
  if (server) {
    await server.close()
    server = null
  }
})

/** The CLI's `run --output json` payload, narrowed to the fields the parity assertions read. */
interface CliRunResult {
  success: boolean
  failedBlocks: number
  failureCategory?: string
  error?: string
  blocks: Array<{ id: string; type: string; success: boolean; outputs: IOutput[] }>
}

interface RunOutcome {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Run the built CLI and capture stdout/stderr/exit code. A failed run exits non-zero (e.g.
 * missing kernel → InvalidUsage = 2), so a non-zero exit is data, not a thrown error — normalize
 * both into a {@link RunOutcome}. Runs from {@link workDir} so persisted snapshots never touch the repo.
 */
async function runCli(args: string[]): Promise<RunOutcome> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [cliBin, ...args], {
      cwd: workDir,
      maxBuffer: 32 * 1024 * 1024,
    })
    return { exitCode: 0, stdout, stderr }
  } catch (error) {
    const err = error as { code?: number; stdout?: string; stderr?: string }
    return { exitCode: typeof err.code === 'number' ? err.code : 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

/** Open a `Session` over a fixture and boot a real server bound to loopback on an OS-assigned port. */
async function bootServer(fixture: string, kernel = 'python3'): Promise<{ server: RuntimeServer; port: number }> {
  const session = new Session()
  await session.loadProject(fixture, { python: venv as string, kernel })
  const s = createServer({ session })
  const port = await s.listen(0, '127.0.0.1')
  return { server: s, port }
}

/** Open a WS client to the server's /api/stream and resolve once connected. */
function connect(port: number): Promise<WebSocket> {
  return new Promise((resolveWs, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/stream`)
    ws.once('open', () => resolveWs(ws))
    ws.once('error', reject)
  })
}

/** Collect events until a terminal (`run-done`/`run-failed`/`run-cancelled`) arrives (or timeout). */
function collectUntilTerminal(ws: WebSocket, timeoutMs = 60_000): Promise<WsServerEvent[]> {
  return new Promise((resolveEvents, reject) => {
    const events: WsServerEvent[] = []
    const timer = setTimeout(() => reject(new Error(`no terminal after ${events.length} events`)), timeoutMs)
    ws.on('message', data => {
      const event = JSON.parse(data.toString()) as WsServerEvent
      events.push(event)
      if (event.type === 'run-done' || event.type === 'run-failed' || event.type === 'run-cancelled') {
        clearTimeout(timer)
        resolveEvents(events)
      }
    })
  })
}

/** Drive a full run-all over WS: connect, start collecting, POST the run, await the terminal. */
async function runAllOverWs(port: number, timeoutMs = 60_000): Promise<WsServerEvent[]> {
  const ws = await connect(port)
  try {
    const collected = collectUntilTerminal(ws, timeoutMs)
    const res = await fetch(`http://127.0.0.1:${port}/api/project/run`, { method: 'POST' })
    expect(res.status).toBe(202)
    return await collected
  } finally {
    ws.close()
  }
}

/** Group the streamed `output` events into the per-block `IOutput[]` the server delivered. */
function serverOutputsByBlock(events: WsServerEvent[]): Map<string, IOutput[]> {
  const byBlock = new Map<string, IOutput[]>()
  for (const event of events) {
    if (event.type === 'output' && event.truncated !== true) {
      const list = byBlock.get(event.blockId) ?? []
      list.push(event.output)
      byBlock.set(event.blockId, list)
    }
  }
  return byBlock
}

describeIntegration('server ↔ `deepnote run` parity (real kernel)', () => {
  it('Scenario 1 (Critical): streamed IOutputs deep-equal `deepnote run --output json` for every executable block', async () => {
    // CLI side: run the same fixture with `deepnote run --output json` against the real kernel.
    const { exitCode, stdout, stderr } = await runCli([
      'run',
      parityFixture,
      '--kernel',
      'python3',
      '--python',
      venv as string,
      '-o',
      'json',
    ])
    expect(exitCode, `CLI failed:\n${stderr}`).toBe(0)
    const cli = JSON.parse(stdout) as CliRunResult
    expect(cli.success).toBe(true)
    expect(cli.failedBlocks).toBe(0)

    // Server side: boot, run-all over WS, collect the streamed events.
    const booted = await bootServer(parityFixture)
    server = booted.server
    const events = await runAllOverWs(booted.port)

    // The terminal is a clean run-done (no kernel death on the happy path).
    const terminal = events[events.length - 1]
    expect(terminal.type).toBe('run-done')

    // Events arrived in order: run-start before any block-start, each block-start before its
    // outputs/block-done, run-done last. (R3 "events in order".)
    const types = events.map(e => e.type)
    expect(types[0]).toBe('run-start')
    expect(types[types.length - 1]).toBe('run-done')
    const firstBlockStart = types.indexOf('block-start')
    const firstOutput = types.indexOf('output')
    expect(firstBlockStart).toBeGreaterThanOrEqual(0)
    expect(firstBlockStart).toBeLessThan(firstOutput)

    // No within-block truncation marker on the parity fixture (small, deterministic outputs).
    expect(events.some(e => e.type === 'output' && e.truncated === true)).toBe(false)

    // The capstone: the IOutputs the server streamed per block deep-equal the IOutputs the CLI
    // produced for the same block. Compare keyed by blockId (block ordering is identical, but
    // keying by id makes the diff legible on failure). Within a block, order is preserved.
    const serverByBlock = serverOutputsByBlock(events)
    const cliByBlock = new Map(cli.blocks.map(b => [b.id, b.outputs]))

    // 100% of executable block types on the fixture are represented in both maps (same block set).
    expect([...serverByBlock.keys()].sort()).toEqual([...cliByBlock.keys()].sort())
    // The fixture's executable blocks all produce at least one output, so neither map is empty.
    expect(serverByBlock.size).toBeGreaterThan(0)

    for (const [blockId, cliOutputs] of cliByBlock) {
      expect(serverByBlock.get(blockId), `no server outputs for block ${blockId}`).toEqual(cliOutputs)
    }
  })

  it('Scenario 2 (Critical): a missing kernel surfaces `missing-kernel` end-to-end with a terminal event (no hang)', async () => {
    // Boot the server with a kernel name that is not registered. The kernel-start failure must
    // reach the consumer as a typed discriminant, not a stringified message, and must terminate.
    const booted = await bootServer(parityFixture, 'no_such_kernel')
    server = booted.server

    // The HTTP run route is the category-bearing path (s1): it returns 500 { failureCategory }.
    const ws = await connect(booted.port)
    try {
      const res = await fetch(`http://127.0.0.1:${booted.port}/api/project/run`, { method: 'POST' })
      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: string; failureCategory?: string }

      // The typed discriminant — not a parsed substring of an opaque message.
      expect(body.failureCategory).toBe('missing-kernel')
      // The message names the requested kernel; it is never the server's opaque 500.
      expect(body.error).toContain('no_such_kernel')
      expect(body.error).not.toMatch(/unhandled error/i)
    } finally {
      ws.close()
    }
  })

  it('Scenario 4 (High): mid-run kernel death is terminal — `run-failed { kernel-died }`, no further events for the runId', async () => {
    const booted = await bootServer(kernelDeathFixture)
    server = booted.server
    const events = await runAllOverWs(booted.port)

    // The terminal is the kernel-death-only `run-failed`, carrying the typed discriminant.
    const terminal = events[events.length - 1]
    expect(terminal.type).toBe('run-failed')
    if (terminal.type === 'run-failed') {
      expect(terminal.failureCategory).toBe('kernel-died')
      const runId = terminal.runId

      // No further events for that runId arrived after the terminal — it really is terminal.
      const terminalIndex = events.indexOf(terminal)
      const afterTerminalForRun = events.slice(terminalIndex + 1).filter(e => e.runId === runId)
      expect(afterTerminalForRun).toEqual([])
    }

    // The block after the kill never produced its stream output (the run was cut short).
    const printed = events.some(
      e => e.type === 'output' && e.truncated !== true && JSON.stringify(e.output).includes('should-never-print')
    )
    expect(printed).toBe(false)
  })

  it('Scenario 3 (High): serve boots over a real socket, answers GET /api/project, and is bound to loopback (never 0.0.0.0)', async () => {
    // Boot the EXACT wiring `deepnote serve fixture.deepnote --no-open` performs: a real `Session`
    // loaded over the fixture, wrapped by the real `createServer`, bound to '127.0.0.1' (the
    // command's `BIND_HOST`) on a real socket. `serve.ts` is a thin wrapper around precisely this,
    // so asserting here on the server-side bound address is the real-socket guard for the loopback
    // security boundary (step-6 `zq7q0g` proves it only at the unit layer).
    const booted = await bootServer(parityFixture)
    server = booted.server

    // GET /api/project answers with the opened tree (no kernel needed — KD-6 open is kernel-free).
    const res = await fetch(`http://127.0.0.1:${booted.port}/api/project`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { path: string; project: { name: string } }
    expect(body.project.name).toBe('server-run-parity')

    // Real-socket loopback guard (reviewer-1 L2). Assert on the SERVER-SIDE bound AddressInfo via
    // the `boundAddress()` accessor — NOT the client socket's `localAddress`, which always reads
    // 127.0.0.1 over a loopback connection regardless of the server's bind interface (the exact
    // B1 false-positive). This negative leg FAILS if the server bound `0.0.0.0` / all interfaces.
    expect(server.boundAddress()).toBe('127.0.0.1')
    expect(server.boundAddress()).not.toBe('0.0.0.0')

    // Stronger real-socket negative leg: a connect to a non-loopback IPv4 of this host on the same
    // port must be REFUSED, proving the listener is genuinely off-interface. Skip only when the
    // host exposes no non-internal IPv4 (e.g. a loopback-only CI runner) — there is nothing to probe.
    const externalIp = firstNonInternalIPv4()
    if (externalIp) {
      await expect(
        fetch(`http://${externalIp}:${booted.port}/api/project`, {
          signal: AbortSignal.timeout(2000),
        })
      ).rejects.toThrow()
    }

    // Shuts down cleanly (the SIGINT path: server.close() → session.close() → engine.stop()). No
    // engine was started (open is kernel-free), so this is the clean teardown the smoke asserts.
    await server.close()
    server = null
  })
})

/**
 * The first non-internal IPv4 address of this host, or `null` when the host is loopback-only.
 * Used by the Scenario-3 negative leg to prove the loopback listener is unreachable off-interface.
 */
function firstNonInternalIPv4(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address
      }
    }
  }
  return null
}
