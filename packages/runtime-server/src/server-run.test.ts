import type { DeepnoteBlock } from '@deepnote/blocks'
import type { ExecutionSummary } from '@deepnote/runtime-core'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import type { WsServerEvent } from './api-types'
import type { SaveResult } from './save'
import { createServer, type RuntimeServer } from './server'
import { type RunProjectCallbacks, type RunProjectRequest, type ServerSession, StartEngineError } from './session'

/** Shared save stub for the run-focused fake sessions — save behavior is covered in `save.test.ts`. */
const unusedSave = async (): Promise<SaveResult> => {
  throw new Error('save not used in these tests')
}

/**
 * Server-level wiring tests (step 4A): the HTTP `POST /…/run` routes, the `/api/stream` WS
 * fan-out, and the queue ↔ route ↔ socket integration — driven against a **fake**
 * {@link ServerSession} so no real kernel is needed (the `ServerSession` interface is exactly the
 * decoupling that makes this possible). These assert the route status codes and that a run's
 * ordered events actually reach a connected WS client.
 */

const block = (id: string): DeepnoteBlock =>
  ({ id, type: 'code', content: '', sortingKey: 'a', blockGroup: id, metadata: {} }) as DeepnoteBlock

/** A fake session whose `runProject` emits a scripted block then resolves (no kernel). */
class FakeSession implements ServerSession {
  startEngineCalls = 0
  startError: StartEngineError | null = null

  apiProject(): never {
    throw new Error('not used in these tests')
  }
  async startEngine(): Promise<void> {
    this.startEngineCalls++
    if (this.startError) {
      throw this.startError
    }
  }
  async runProject(_request: RunProjectRequest, callbacks: RunProjectCallbacks): Promise<ExecutionSummary> {
    const b = block('b1')
    await callbacks.onBlockStart(b, 0, 1)
    callbacks.onOutput(b.id, { output_type: 'stream', name: 'stdout', text: 'hello' })
    await callbacks.onBlockDone({
      blockId: b.id,
      blockType: 'code',
      success: true,
      outputs: [],
      executionCount: 1,
      durationMs: 1,
    })
    return { totalBlocks: 1, executedBlocks: 1, failedBlocks: 0, totalDurationMs: 1 }
  }
  save = unusedSave
  async close(): Promise<void> {}
}

let server: RuntimeServer | null = null
afterEach(async () => {
  if (server) {
    await server.close()
    server = null
  }
})

/** Open a WS client to the server's /api/stream and resolve once connected. */
function connect(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/stream`)
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
  })
}

/** Collect events until a `run-done`/`run-failed`/`run-cancelled` terminal arrives (or timeout). */
function collectUntilTerminal(ws: WebSocket, timeoutMs = 5000): Promise<WsServerEvent[]> {
  return new Promise((resolve, reject) => {
    const events: WsServerEvent[] = []
    const timer = setTimeout(() => reject(new Error(`no terminal after ${events.length} events`)), timeoutMs)
    ws.on('message', data => {
      const event = JSON.parse(data.toString()) as WsServerEvent
      events.push(event)
      if (event.type === 'run-done' || event.type === 'run-failed' || event.type === 'run-cancelled') {
        clearTimeout(timer)
        resolve(events)
      }
    })
  })
}

async function postJson(port: number, path: string, method = 'POST'): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method })
  return { status: res.status, body: await res.json() }
}

describe('createServer — HTTP run routes + WS fan-out', () => {
  it('POST /api/project/run returns 202 {runId} and the run streams ordered events over /api/stream', async () => {
    const session = new FakeSession()
    server = createServer({ session })
    const port = await server.listen(0)

    const ws = await connect(port)
    const collected = collectUntilTerminal(ws)

    const res = await postJson(port, '/api/project/run')
    expect(res.status).toBe(202)
    expect(res.body).toEqual({ runId: 1 })

    const events = await collected
    expect(events.map(e => e.type)).toEqual(['run-start', 'block-start', 'output', 'block-done', 'run-done'])
    expect(events.every(e => e.runId === 1)).toBe(true)
    ws.close()
  })

  it('POST /api/notebooks/{nb}/blocks/{id}/run URL-decodes the ids and enqueues (202)', async () => {
    const session = new FakeSession()
    server = createServer({ session })
    const port = await server.listen(0)
    const res = await postJson(port, '/api/notebooks/My%20NB/blocks/block-1/run')
    expect(res.status).toBe(202)
    expect(res.body).toEqual({ runId: 1 })
  })

  it('P3: a run posted while maxDepth is full returns 429 {error:queue-full}', async () => {
    // A session whose run never resolves keeps the queue busy so the backlog fills.
    const stuck: ServerSession = {
      apiProject: () => {
        throw new Error('x')
      },
      startEngine: async () => {},
      runProject: () => new Promise<ExecutionSummary>(() => {}), // never resolves
      save: unusedSave,
      close: async () => {},
    }
    server = createServer({ session: stuck, runQueueDepth: 1 })
    const port = await server.listen(0)

    const first = await postJson(port, '/api/project/run') // P1 (running, never resolves)
    expect(first.status).toBe(202)
    const second = await postJson(port, '/api/project/run') // P2 (pending = 1 = maxDepth)
    expect(second.status).toBe(202)
    const third = await postJson(port, '/api/project/run') // P3
    expect(third.status).toBe(429)
    expect(third.body).toEqual({ error: 'queue-full' })
  })

  it('a kernel-start failure returns 500 {error, failureCategory} (R5) and does not enqueue', async () => {
    const session = new FakeSession()
    session.startError = new StartEngineError('missing-kernel', "Kernel 'bash' is not registered.")
    server = createServer({ session })
    const port = await server.listen(0)
    const res = await postJson(port, '/api/project/run')
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ failureCategory: 'missing-kernel' })
  })

  it('a WS run message triggers a run, and a WS cancel of a queued run emits run-cancelled', async () => {
    // First run never resolves (stays running); the second WS run is queued, then cancelled.
    let resolveFirst: (s: ExecutionSummary) => void = () => {}
    const firstRun = new Promise<ExecutionSummary>(r => {
      resolveFirst = r
    })
    const session: ServerSession = {
      apiProject: () => {
        throw new Error('x')
      },
      startEngine: async () => {},
      runProject: () => firstRun,
      save: unusedSave,
      close: async () => {},
    }
    server = createServer({ session })
    const port = await server.listen(0)

    const ws = await connect(port)
    const seen: WsServerEvent[] = []
    ws.on('message', data => seen.push(JSON.parse(data.toString()) as WsServerEvent))

    ws.send(JSON.stringify({ type: 'run', blockId: 'A' })) // runId 1 — runs (never resolves)
    ws.send(JSON.stringify({ type: 'run', blockId: 'B' })) // runId 2 — queued

    // Wait for the run-queued ack for runId 2.
    await waitFor(() => seen.some(e => e.type === 'run-queued' && e.runId === 2))
    ws.send(JSON.stringify({ type: 'cancel', runId: 2 }))
    await waitFor(() => seen.some(e => e.type === 'run-cancelled' && e.runId === 2))

    expect(seen.some(e => e.type === 'run-start' && e.runId === 1)).toBe(true)
    // runId 2 was cancelled before it ever started.
    expect(seen.some(e => e.type === 'run-start' && e.runId === 2)).toBe(false)
    resolveFirst({ totalBlocks: 1, executedBlocks: 1, failedBlocks: 0, totalDurationMs: 1 })
    ws.close()
  })

  it('a WS upgrade on a non-/api/stream path is rejected (404), not accepted', async () => {
    const session = new FakeSession()
    server = createServer({ session })
    const port = await server.listen(0)
    await expect(
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/api/wrong`)
        ws.once('open', () => reject(new Error('should not connect')))
        ws.once('error', () => resolve())
      })
    ).resolves.toBeUndefined()
  })
})

/** Poll a predicate to true (small interval) — for the event-driven WS assertions. */
function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const poll = (): void => {
      if (predicate()) {
        resolve()
        return
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('waitFor timed out'))
        return
      }
      setTimeout(poll, 5)
    }
    poll()
  })
}
