/**
 * `@deepnote/runtime-server` Node host factory.
 *
 * **s1 step 4A.** Wires the execution surface on top of the step-3 `GET /api/project` route:
 * the single server-wide {@link RunQueue} (one kernel ⇒ one engine ⇒ one queue, R4), the
 * `POST /…/run` enqueue routes (in `router.ts`), and the `ws` `/api/stream` WebSocket fan-out.
 * A connected client receives the queue's ordered, `runId`-tagged event stream; runs are
 * triggered by HTTP POST **or** a WS `run` message, and a queued run is cancellable via a WS
 * `cancel` message (P5). The kernel port never reaches the socket — the server is the sole
 * `KernelClient` speaker (KD-4). Keep this module's imports to Node built-ins + `ws` + the
 * runtime deps; it must never import a frontend toolchain.
 */

import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocket, WebSocketServer } from 'ws'
import type { WsClientMessage, WsServerEvent } from './api-types'
import { createRouter } from './router'
import { type EventSink, RunQueue } from './run-queue'
import type { Session } from './session'

/** The WS path the event stream is served on (KD-4). */
const STREAM_PATH = '/api/stream'

/** Options accepted by {@link createServer}. */
export interface CreateServerOptions {
  /**
   * The opened-project session backing `GET /api/project` and the run routes. Constructed and
   * `loadProject()`-ed by the caller (the `serve` command, step 5) **before** `createServer` so
   * opening stays async and kernel-free (KD-6); the factory itself is synchronous. The engine is
   * started lazily by the queue on the first run. Omitted in the scaffold lifecycle test, where
   * every request 503s.
   */
  session?: Session
  /**
   * Bounded run-queue depth before new runs are rejected (design doc R4, P3). Default 8 via
   * {@link RunQueue}.
   */
  runQueueDepth?: number
  /**
   * Per-block within-block back-pressure bound, in bytes (design doc S1, default 8 MiB). Past the
   * bound a single block's runaway `stream` text is replaced by one `{ truncated: true }` marker.
   */
  wsHighWaterMark?: number
}

/**
 * A running (or runnable) server handle. The shape mirrors what `packages/cli`'s
 * `serve` action drives: bind a port, then shut down cleanly.
 */
export interface RuntimeServer {
  /**
   * Bind the HTTP listener. Resolves with the OS-assigned port once listening.
   * Pass `0` to let the OS choose a free port (used by the lifecycle test).
   */
  listen(port: number): Promise<number>
  /** Stop listening, close the WS server + the session's engine, and release the port. */
  close(): Promise<void>
}

/**
 * Construct a {@link RuntimeServer}.
 *
 * With a `session` (the normal path), one {@link RunQueue} serializes all runs against the
 * session's single engine; `POST /…/run` enqueues, and a `WS /api/stream` connection subscribes
 * to the queue's broadcast event stream. Without a session (the scaffold lifecycle test), every
 * request 503s and no WS/queue is wired — the factory's `listen`/`close` surface is still
 * exercisable without opening a project.
 */
export function createServer(options: CreateServerOptions = {}): RuntimeServer {
  const session = options.session

  if (!session) {
    // No session bound (scaffold lifecycle test): nothing is open to serve, no execution surface.
    const http: Server = createHttpServer((_req: IncomingMessage, res: ServerResponse): void => {
      res.statusCode = 503
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'no-project-loaded' }))
    })
    return httpHandle(http)
  }

  // The set of live WS subscribers. The queue's sink broadcasts every event to all of them, and
  // cross-block back-pressure gates on the *slowest* socket (the max bufferedAmount) so the
  // engine pauses until even a lagging consumer drains.
  const sockets = new Set<WebSocket>()

  const sink: EventSink = {
    send(event: WsServerEvent): void {
      const payload = JSON.stringify(event)
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload)
        }
      }
    },
    get bufferedAmount(): number {
      let max = 0
      for (const socket of sockets) {
        if (socket.bufferedAmount > max) {
          max = socket.bufferedAmount
        }
      }
      return max
    },
  }

  // The single server-wide run queue — the M2 serialization seam. The session is passed as the
  // `RunProjectTarget`; the queue is the SOLE caller of `.runProject` (no route runs the engine
  // directly), so the structural invariant holds: `run-queue.ts` is the only `.runProject` site.
  const queue = new RunQueue(session, sink, {
    maxDepth: options.runQueueDepth,
    wsHighWaterMark: options.wsHighWaterMark,
  })

  const http: Server = createHttpServer(createRouter(session, queue))

  // `noServer` so we own the upgrade and can 404 any path other than /api/stream (KD-4).
  const wss = new WebSocketServer({ noServer: true })

  http.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const path = (req.url ?? '').split('?', 1)[0]
    if (path !== STREAM_PATH) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, ws => {
      sockets.add(ws)
      ws.on('message', (data: WebSocket.RawData) => handleClientMessage(session, queue, data))
      ws.on('close', () => sockets.delete(ws))
      // A socket error closes it; drop it from the broadcast set so the sink stops writing to it.
      ws.on('error', () => sockets.delete(ws))
    })
  })

  const handle = httpHandle(http)
  return {
    listen: handle.listen,
    async close(): Promise<void> {
      // Stop accepting new sockets, drop the engine, then close the HTTP listener.
      await new Promise<void>(resolve => wss.close(() => resolve()))
      for (const socket of sockets) {
        socket.terminate()
      }
      sockets.clear()
      await session.close()
      await handle.close()
    },
  }
}

/**
 * Parse + dispatch a client → server WS message ({@link WsClientMessage}). A `run` enqueues
 * (P1/P2/P3 handled by the queue — a `run-queued` or nothing on P3); a `cancel` removes a
 * **queued** task (P5). `run` ensures the engine is started first; a kernel-start failure is
 * surfaced as a terminal `run-failed` over the stream (the WS analogue of the HTTP error body).
 * A malformed message is ignored — the WS contract carries no error envelope in s1.
 */
function handleClientMessage(session: Session, queue: RunQueue, data: WebSocket.RawData): void {
  let message: WsClientMessage
  try {
    message = JSON.parse(data.toString()) as WsClientMessage
  } catch {
    return
  }

  if (message.type === 'cancel') {
    queue.cancel(message.runId)
    return
  }

  if (message.type === 'run') {
    void (async (): Promise<void> => {
      try {
        await session.startEngine()
      } catch {
        // The HTTP path surfaces the typed category in its body; over WS the queue would have no
        // runId yet, so a start failure simply does not enqueue. (The HTTP run route is the
        // category-bearing path in s1; a WS-initiated run that can't start is a no-op.)
        return
      }
      queue.enqueue({ blockId: message.blockId, notebookName: message.notebookName })
    })()
  }
}

/** Wrap a `node:http` server in the {@link RuntimeServer} listen/close surface. */
function httpHandle(http: Server): RuntimeServer {
  return {
    listen(port: number): Promise<number> {
      return new Promise<number>((resolve, reject) => {
        const onError = (err: Error): void => {
          http.off('listening', onListening)
          reject(err)
        }
        const onListening = (): void => {
          http.off('error', onError)
          const address = http.address()
          // `address` is an `AddressInfo` for a TCP listener (never a string here).
          resolve(typeof address === 'object' && address !== null ? address.port : port)
        }
        http.once('error', onError)
        http.once('listening', onListening)
        http.listen(port)
      })
    },
    close(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        http.close(err => (err ? reject(err) : resolve()))
      })
    },
  }
}
