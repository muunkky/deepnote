import type { WsServerEvent } from '@deepnote/runtime-server/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExecutionClient, RunTriggerError } from './ExecutionClient'

// Runtime behaviour of the SPA's execution transport seam (design Phase 1, KD-2 / R6).
//
// Two protocols, two stubs:
//   - `runBlock`/`runAll` TRIGGER via HTTP `POST .../run` (the s1 route returns `202 {runId}`
//     synchronously, KD-2) — exercised against a stubbed `globalThis.fetch` that returns
//     202 {runId} / 429 {error:'queue-full'} / 500 {failureCategory}.
//   - `subscribe`/`cancel` ride the subscribe-only `WS /api/stream` — exercised against a fake
//     `globalThis.WebSocket` we can drive (open, push a frame, close).
//
// Everything is type-only against `@deepnote/runtime-server/types`; the transport is the browser
// `fetch` + `WebSocket` globals — no backend runtime value, no `node:` import — so the suite stays
// inside the ADR-006/007 isolation boundary and never opens a real socket.

// ----------------------------------------------------------------------------------------------
// Fake WebSocket — a minimal, test-driven stand-in for the browser global.
// ----------------------------------------------------------------------------------------------

type Listener = (event: unknown) => void

/** A test-controllable `WebSocket`: open/close/message are driven by the test, sends are recorded. */
class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  /** Every instance constructed during a test, in order — lets a test reach the live socket. */
  static instances: FakeWebSocket[] = []

  readonly url: string
  readyState = FakeWebSocket.CONNECTING
  readonly sent: string[] = []
  closed = false

  private readonly listeners: Record<string, Listener[]> = {}

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener): void {
    const list = this.listeners[type] ?? []
    this.listeners[type] = list
    list.push(listener)
  }

  removeEventListener(type: string, listener: Listener): void {
    const list = this.listeners[type]
    if (!list) return
    const i = list.indexOf(listener)
    if (i >= 0) list.splice(i, 1)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
    this.readyState = FakeWebSocket.CLOSED
  }

  // --- test drivers ---

  /** Transition to OPEN and fire the `open` event the client awaits in `connect()`. */
  fireOpen(): void {
    this.readyState = FakeWebSocket.OPEN
    this.emit('open', {})
  }

  /** Deliver an inbound frame as a `message` event with a `data` string. */
  fireMessage(data: string): void {
    this.emit('message', { data })
  }

  /** Fire a `close` event (the client's reconnect trigger). */
  fireClose(): void {
    this.readyState = FakeWebSocket.CLOSED
    this.emit('close', {})
  }

  private emit(type: string, event: unknown): void {
    for (const listener of this.listeners[type] ?? []) listener(event)
  }
}

/** Stub `globalThis.fetch` with one canned `Response`-like object; returns the spy. */
function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => response as unknown as Response)
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('ExecutionClient — HTTP trigger (KD-2)', () => {
  it('runBlock POSTs to /api/notebooks/{nb}/blocks/{id}/run and resolves the 202 runId', async () => {
    const fetchSpy = stubFetch({ ok: true, status: 202, json: async () => ({ runId: 7 }) })
    const client = createExecutionClient('http://127.0.0.1:9999')

    const runId = await client.runBlock('b1', 'nb')

    expect(runId).toBe(7)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toBe('http://127.0.0.1:9999/api/notebooks/nb/blocks/b1/run')
    expect(init?.method).toBe('POST')
  })

  it('URL-encodes the notebook name and block id in the run path', async () => {
    const fetchSpy = stubFetch({ ok: true, status: 202, json: async () => ({ runId: 1 }) })
    const client = createExecutionClient('')

    await client.runBlock('blk/a b', 'nb name')

    const [url] = fetchSpy.mock.calls[0] as [string]
    expect(url).toBe('/api/notebooks/nb%20name/blocks/blk%2Fa%20b/run')
  })

  it('runAll POSTs to /api/project/run and resolves the 202 runId', async () => {
    const fetchSpy = stubFetch({ ok: true, status: 202, json: async () => ({ runId: 42 }) })
    const client = createExecutionClient('')

    const runId = await client.runAll()

    expect(runId).toBe(42)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toBe('/api/project/run')
    expect(init?.method).toBe('POST')
  })

  it('rejects RunTrigger("queue-full") on a 429', async () => {
    stubFetch({ ok: false, status: 429, json: async () => ({ error: 'queue-full' }) })
    const client = createExecutionClient('')

    const error = await client.runBlock('b1', 'nb').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RunTriggerError)
    expect((error as RunTriggerError).reason).toBe('queue-full')
    expect((error as RunTriggerError).status).toBe(429)
  })

  it('rejects RunTriggerError carrying the failureCategory on a 500', async () => {
    stubFetch({
      ok: false,
      status: 500,
      json: async () => ({ error: 'deepnote-toolkit not installed', failureCategory: 'missing-kernel' }),
    })
    const client = createExecutionClient('')

    const error = await client.runAll().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RunTriggerError)
    expect((error as RunTriggerError).reason).toBe('engine-start')
    expect((error as RunTriggerError).failureCategory).toBe('missing-kernel')
    expect((error as RunTriggerError).status).toBe(500)
    expect((error as RunTriggerError).message).toContain('deepnote-toolkit not installed')
  })

  it('wraps a pre-response network failure in a RunTriggerError (no status)', async () => {
    const fn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fn)
    const client = createExecutionClient('')

    const error = await client.runBlock('b1', 'nb').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RunTriggerError)
    expect((error as RunTriggerError).reason).toBe('network')
    expect((error as RunTriggerError).status).toBeUndefined()
  })
})

describe('ExecutionClient — WS subscribe-only stream', () => {
  it('connect derives the ws URL from the base URL and resolves once OPEN', async () => {
    const client = createExecutionClient('http://127.0.0.1:9999')

    const connected = client.connect()
    expect(client.status).toBe('connecting')

    const socket = FakeWebSocket.instances[0]
    expect(socket.url).toBe('ws://127.0.0.1:9999/api/stream')

    socket.fireOpen()
    await connected
    expect(client.status).toBe('open')
  })

  it('derives a wss:// URL from an https base URL', async () => {
    const client = createExecutionClient('https://example.test:8443')
    void client.connect()
    expect(FakeWebSocket.instances[0].url).toBe('wss://example.test:8443/api/stream')
  })

  it('derives the ws URL from the page origin when the base URL is empty', async () => {
    // jsdom's default origin is http://localhost:3000 → ws://localhost:3000/api/stream.
    const client = createExecutionClient('')
    void client.connect()
    expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:3000/api/stream')
  })

  it('delivers parsed WsServerEvents to a subscriber in arrival order', async () => {
    const client = createExecutionClient('')
    const received: WsServerEvent[] = []
    client.subscribe(event => received.push(event))

    const connected = client.connect()
    const socket = FakeWebSocket.instances[0]
    socket.fireOpen()
    await connected

    socket.fireMessage(JSON.stringify({ type: 'run-start', runId: 3, totalBlocks: 0 }))
    socket.fireMessage(JSON.stringify({ type: 'block-start', runId: 3, blockId: 'b1', index: 0, total: 1 }))

    expect(received).toEqual([
      { type: 'run-start', runId: 3, totalBlocks: 0 },
      { type: 'block-start', runId: 3, blockId: 'b1', index: 0, total: 1 },
    ])
  })

  it('drops a malformed frame without throwing and keeps delivering valid frames', async () => {
    const client = createExecutionClient('')
    const received: WsServerEvent[] = []
    client.subscribe(event => received.push(event))

    const connected = client.connect()
    const socket = FakeWebSocket.instances[0]
    socket.fireOpen()
    await connected

    expect(() => socket.fireMessage('}{ not json')).not.toThrow()
    socket.fireMessage(JSON.stringify({ type: 'run-done', runId: 3, executedBlocks: 1, failedBlocks: 0 }))

    expect(received).toEqual([{ type: 'run-done', runId: 3, executedBlocks: 1, failedBlocks: 0 }])
  })

  it('unsubscribe stops further deliveries', async () => {
    const client = createExecutionClient('')
    const received: WsServerEvent[] = []
    const unsubscribe = client.subscribe(event => received.push(event))

    const connected = client.connect()
    const socket = FakeWebSocket.instances[0]
    socket.fireOpen()
    await connected

    socket.fireMessage(JSON.stringify({ type: 'run-cancelled', runId: 1 }))
    unsubscribe()
    socket.fireMessage(JSON.stringify({ type: 'run-cancelled', runId: 2 }))

    expect(received).toEqual([{ type: 'run-cancelled', runId: 1 }])
  })

  it('cancel serializes exactly {type:"cancel",runId} over the socket', async () => {
    const client = createExecutionClient('')
    const connected = client.connect()
    const socket = FakeWebSocket.instances[0]
    socket.fireOpen()
    await connected

    client.cancel(9)

    expect(socket.sent).toEqual([JSON.stringify({ type: 'cancel', runId: 9 })])
  })

  it('reconnects with a capped backoff after the socket closes', async () => {
    vi.useFakeTimers()
    const client = createExecutionClient('')

    const connected = client.connect()
    const first = FakeWebSocket.instances[0]
    first.fireOpen()
    await connected
    expect(client.status).toBe('open')

    // Socket drops: the client schedules a reconnect rather than giving up.
    first.fireClose()
    expect(client.status).toBe('connecting')
    expect(FakeWebSocket.instances).toHaveLength(1)

    // After the backoff delay a fresh socket is constructed.
    await vi.advanceTimersByTimeAsync(5000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1].url).toBe('ws://localhost:3000/api/stream')

    client.close()
  })

  it('close() stops reconnection and marks the client closed', async () => {
    vi.useFakeTimers()
    const client = createExecutionClient('')

    const connected = client.connect()
    const socket = FakeWebSocket.instances[0]
    socket.fireOpen()
    await connected

    client.close()
    expect(client.status).toBe('closed')
    expect(socket.closed).toBe(true)

    // A close event after an explicit close() must NOT trigger a reconnect.
    socket.fireClose()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
