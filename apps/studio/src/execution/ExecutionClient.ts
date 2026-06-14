import type { KernelFailureCategory, RunId, WsClientMessage, WsServerEvent } from '@deepnote/runtime-server/types'

// The SPA's execution transport seam (design `m3-s3-live-execution.md` Phase 1, KD-2 / R6).
//
// This is the FIRST runtime (non-type) backend interaction `apps/studio` has: a browser
// `WebSocket` to the local `deepnote serve` process plus `fetch` POSTs to its run routes. It
// stays inside the ADR-006/007 isolation boundary by construction — the WS/HTTP SHAPES are
// imported TYPE-ONLY from `@deepnote/runtime-server/types`, and the TRANSPORT is the
// browser-native `fetch` + `WebSocket` globals. No backend runtime value, no `node:` builtin
// (the `apps-studio-isolation` test asserts this behaviourally).
//
// Two protocols, by design (ADR-005, KD-2):
//   - TRIGGER over HTTP. `runBlock`/`runAll` POST the s1 `.../run` routes, which return
//     `202 { runId }` synchronously. The SPA binds `runId → block(s)` at request time —
//     deterministic correlation, multi-tab-safe, no fragile "next un-bound run-start is mine"
//     inference (KD-2's rejected alternative).
//   - STREAM + CANCEL over the WS. `WS /api/stream` is SUBSCRIBE-ONLY: the client folds the
//     ordered `runId`-tagged `WsServerEvent` broadcast to its subscribers (each caller filters
//     to the `runId`s it owns), and `cancel(runId)` sends the WS `{type:'cancel',runId}`.

/** Why a run trigger (`runBlock`/`runAll`) failed — the discriminant the UI branches on. */
export type RunTriggerReason =
  /** The bounded run queue was full (HTTP `429 { error:'queue-full' }`). */
  | 'queue-full'
  /** The kernel/engine could not start (HTTP `500 { error, failureCategory }`). */
  | 'engine-start'
  /** The request failed before a response (offline / connection refused / DNS / parse). */
  | 'network'

/**
 * A typed failure of a run trigger. `reason` is the discriminant the UI branches on;
 * `failureCategory` is present only for an `engine-start` failure (the s1 `500` body's typed
 * {@link KernelFailureCategory}, e.g. `missing-kernel`), so the UI can show the exact actionable
 * remediation (KD-5). `status` is the HTTP status when one was received, `undefined` for a
 * pre-response (`network`) failure. `message` carries the s1-surfaced `{ error }` text verbatim.
 */
export class RunTriggerError extends Error {
  readonly reason: RunTriggerReason
  readonly status?: number
  readonly failureCategory?: KernelFailureCategory

  constructor(
    message: string,
    reason: RunTriggerReason,
    options: { status?: number; failureCategory?: KernelFailureCategory } = {}
  ) {
    super(message)
    this.name = 'RunTriggerError'
    this.reason = reason
    this.status = options.status
    this.failureCategory = options.failureCategory
    // Restore the prototype chain so `instanceof RunTriggerError` holds after transpilation to
    // ES targets that break subclassing of built-ins.
    Object.setPrototypeOf(this, RunTriggerError.prototype)
  }
}

/** The single-connection transport contract the `runStore`/`useExecution` (Phase 2) build on. */
export interface ExecutionClient {
  /** Connect the subscribe-only event socket (idempotent); resolves once the socket is OPEN. */
  connect(): Promise<void>
  /**
   * Trigger a single-block run via `POST .../notebooks/{nb}/blocks/{id}/run`; resolves with the
   * server `runId` (`202`), or rejects with a {@link RunTriggerError} (queue-full `429` /
   * engine-start `500` / network).
   */
  runBlock(blockId: string, notebookName: string): Promise<RunId>
  /** Trigger a whole-project run-all via `POST /api/project/run`; resolves with the single `runId`. */
  runAll(): Promise<RunId>
  /** Cancel a run (WS), using a `runId` obtained from `runBlock`/`runAll`. */
  cancel(runId: RunId): void
  /**
   * Subscribe to the ordered server event stream (the broadcast WS); returns an unsubscribe.
   * The caller filters to the `runId`s it owns.
   */
  subscribe(onEvent: (event: WsServerEvent) => void): () => void
  /** Connection state for the UI. */
  readonly status: ExecutionClientStatus
  /** Tear down the socket and stop reconnecting. */
  close(): void
}

/** Connection lifecycle states surfaced to the UI. */
export type ExecutionClientStatus = 'idle' | 'connecting' | 'open' | 'closed'

/** First reconnect delay; doubles each attempt up to {@link MAX_BACKOFF_MS}. */
const BASE_BACKOFF_MS = 500
/** Capped reconnect backoff — the WS retries forever but never slower than this. */
const MAX_BACKOFF_MS = 5_000

/**
 * Derive the `/api/stream` WebSocket URL from an HTTP base URL.
 *
 * `http(s)://host[:port]` → `ws(s)://host[:port]/api/stream`. An empty base URL means
 * "same-origin": resolve against the page's `location` (the SPA is normally served by the same
 * `deepnote serve` process), so a relative deploy still gets an absolute `ws(s)://` URL.
 */
export function streamUrl(baseUrl: string): string {
  const base = baseUrl !== '' ? baseUrl : globalThis.location?.origin
  if (base == null || base === '') {
    throw new Error('ExecutionClient: cannot derive a WebSocket URL (no base URL and no page origin)')
  }
  const url = new URL('/api/stream', base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

/**
 * Construct an {@link ExecutionClient} bound to a single backend origin.
 *
 * @param baseUrl Origin to target (default `''` = same-origin). The HTTP triggers POST
 *   `${baseUrl}/api/...`; the WS connects to the {@link streamUrl} derived from it.
 */
export function createExecutionClient(baseUrl = ''): ExecutionClient {
  let socket: WebSocket | undefined
  let status: ExecutionClientStatus = 'idle'
  /** A pending `connect()` resolves when the socket first reaches OPEN. */
  let openResolvers: Array<() => void> = []
  /** Set once `close()` is called — suppresses any further reconnect. */
  let disposed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let backoffMs = BASE_BACKOFF_MS
  const subscribers = new Set<(event: WsServerEvent) => void>()

  function flushOpenResolvers(): void {
    const resolvers = openResolvers
    openResolvers = []
    for (const resolve of resolvers) resolve()
  }

  function handleOpen(): void {
    status = 'open'
    backoffMs = BASE_BACKOFF_MS // reset the backoff on a clean connect
    flushOpenResolvers()
  }

  function handleMessage(event: MessageEvent): void {
    const raw = event.data
    if (typeof raw !== 'string') return
    let parsed: WsServerEvent
    try {
      // Trust the s1 contract: the broadcast frames are `WsServerEvent`s. A malformed frame
      // (JSON.parse throw) is dropped, not fatal — mirrors the server's tolerant handler.
      parsed = JSON.parse(raw) as WsServerEvent
    } catch {
      return
    }
    // Snapshot the subscriber set so an unsubscribe during dispatch can't perturb iteration.
    for (const subscriber of [...subscribers]) subscriber(parsed)
  }

  function handleClose(): void {
    if (disposed) return
    // The broadcast WS has no per-client replay; the owning store resets in-flight blocks to
    // idle (design S2). Here we just keep the socket alive with a capped backoff.
    status = 'connecting'
    scheduleReconnect()
  }

  function scheduleReconnect(): void {
    if (disposed || reconnectTimer !== undefined) return
    const delay = backoffMs
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      if (disposed) return
      openSocket()
    }, delay)
  }

  function openSocket(): void {
    status = 'connecting'
    const ws = new WebSocket(streamUrl(baseUrl))
    socket = ws
    ws.addEventListener('open', handleOpen)
    ws.addEventListener('message', handleMessage as (event: Event) => void)
    ws.addEventListener('close', handleClose)
  }

  async function triggerRun(path: string): Promise<RunId> {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, { method: 'POST' })
    } catch (err) {
      throw new RunTriggerError(err instanceof Error ? err.message : String(err), 'network')
    }

    if (response.status === 429) {
      throw new RunTriggerError(await messageFromBody(response, 'queue-full'), 'queue-full', {
        status: 429,
      })
    }
    if (!response.ok) {
      // s1 engine-start failure: `500 { error, failureCategory }` (KD-5). Surface both.
      const body = await readBody(response)
      throw new RunTriggerError(messageOf(body, `Run failed (HTTP ${response.status})`), 'engine-start', {
        status: response.status,
        failureCategory: failureCategoryOf(body),
      })
    }

    const body = await readBody(response)
    const runId = runIdOf(body)
    if (runId === undefined) {
      throw new RunTriggerError(`Run trigger returned ${response.status} without a runId`, 'network', {
        status: response.status,
      })
    }
    return runId
  }

  return {
    connect(): Promise<void> {
      if (disposed) return Promise.reject(new Error('ExecutionClient: connect() after close()'))
      if (status === 'open') return Promise.resolve()
      const pending = new Promise<void>(resolve => openResolvers.push(resolve))
      if (socket === undefined) openSocket()
      return pending
    },

    runBlock(blockId: string, notebookName: string): Promise<RunId> {
      const path = `/api/notebooks/${encodeURIComponent(notebookName)}/blocks/${encodeURIComponent(blockId)}/run`
      return triggerRun(path)
    },

    runAll(): Promise<RunId> {
      return triggerRun('/api/project/run')
    },

    cancel(runId: RunId): void {
      const message: WsClientMessage = { type: 'cancel', runId }
      socket?.send(JSON.stringify(message))
    },

    subscribe(onEvent: (event: WsServerEvent) => void): () => void {
      subscribers.add(onEvent)
      return () => {
        subscribers.delete(onEvent)
      }
    },

    get status(): ExecutionClientStatus {
      return status
    },

    close(): void {
      disposed = true
      status = 'closed'
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
      if (socket !== undefined) {
        socket.removeEventListener('open', handleOpen)
        socket.removeEventListener('message', handleMessage as (event: Event) => void)
        socket.removeEventListener('close', handleClose)
        socket.close()
        socket = undefined
      }
      flushOpenResolvers()
    },
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP body helpers — tolerant of a missing/unparseable JSON body (the trigger must still
// produce a typed error rather than throw a raw SyntaxError).
// ---------------------------------------------------------------------------------------------

/** Parse a response body as JSON, returning `undefined` if it is absent/unparseable. */
async function readBody(response: Response): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object') return body as Record<string, unknown>
  } catch {
    // fall through
  }
  return undefined
}

/** Extract a numeric `runId` from a parsed body, or `undefined` when absent/ill-typed. */
function runIdOf(body: Record<string, unknown> | undefined): RunId | undefined {
  const value = body?.runId
  return typeof value === 'number' ? value : undefined
}

/** Extract the s1 `{ error }` message from a parsed body, or `undefined`. */
function messageOf(body: Record<string, unknown> | undefined, fallback: string): string {
  const value = body?.error
  return typeof value === 'string' ? value : fallback
}

/** Extract the s1 `{ failureCategory }` from a parsed body, or `undefined`. */
function failureCategoryOf(body: Record<string, unknown> | undefined): KernelFailureCategory | undefined {
  const value = body?.failureCategory
  return typeof value === 'string' ? (value as KernelFailureCategory) : undefined
}

/** Read the response body and surface its `{ error }` message, falling back to a default string. */
async function messageFromBody(response: Response, fallback: string): Promise<string> {
  return messageOf(await readBody(response), fallback)
}
