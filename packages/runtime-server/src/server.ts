/**
 * `@deepnote/runtime-server` Node host factory.
 *
 * **s1 step 3.** Establishes the {@link createServer} factory and wires the first HTTP
 * route, `GET /api/project`, served from an opened {@link Session} (KD-6 — no kernel).
 * The `POST /…/run` execute routes and the `ws` `/api/stream` fan-out land in steps 4A /
 * 4B. Keep this module's imports to Node built-ins + the runtime deps; it must never
 * import a frontend toolchain.
 */

import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { createRouter } from './router'
import type { Session } from './session'

/** Options accepted by {@link createServer}. Expanded in later phases. */
export interface CreateServerOptions {
  /**
   * The opened-project session backing `GET /api/project`. Constructed and
   * `loadProject()`-ed by the caller (the `serve` command, step 5) **before**
   * `createServer` so opening stays async and kernel-free (KD-6); the factory itself is
   * synchronous. Omitted in the scaffold lifecycle test, where every request 503s.
   */
  session?: Session
  /**
   * Bounded run-queue depth before new runs are rejected (design doc R4). Wired
   * in step 4A; accepted here so the option surface is stable from the scaffold.
   */
  runQueueDepth?: number
  /**
   * Per-block within-block back-pressure bound, in bytes (design doc S1, default
   * 8 MiB). Wired in step 4A.
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
  /** Stop listening and release the port. Resolves once fully closed. */
  close(): Promise<void>
}

/**
 * Construct a {@link RuntimeServer}.
 *
 * With a `session` (the normal path), requests route through {@link createRouter}, which
 * serves `GET /api/project` from the opened project (KD-6 — no kernel) and `404`s unknown
 * routes; the `POST /…/run` execute routes arrive in steps 4A / 4B. Without a session (the
 * scaffold lifecycle test), every request 503s — the factory's `listen`/`close` surface is
 * still exercisable without opening a project.
 */
export function createServer(options: CreateServerOptions = {}): RuntimeServer {
  const requestListener = options.session
    ? createRouter(options.session)
    : (_req: IncomingMessage, res: ServerResponse): void => {
        // No session bound (scaffold lifecycle test): nothing is open to serve.
        res.statusCode = 503
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: 'no-project-loaded' }))
      }

  const http: Server = createHttpServer(requestListener)

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
