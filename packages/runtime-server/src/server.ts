/**
 * `@deepnote/runtime-server` Node host factory.
 *
 * **s1 scaffold stub.** This card (m3/s1 step 2) establishes the package boundary
 * and the {@link createServer} factory *shape* only — `listen`/`close` lifecycle
 * over a bare `node:http` server. The real HTTP router (`GET /api/project`,
 * `POST /…/run`, `POST /api/project/save`) and the `ws` `/api/stream` fan-out land
 * in steps 3 / 4A / 4B. Keep this module's imports to Node built-ins + the runtime
 * deps; it must never import a frontend toolchain.
 */

import { createServer as createHttpServer, type Server } from 'node:http'

/** Options accepted by {@link createServer}. Expanded in later phases. */
export interface CreateServerOptions {
  /**
   * Bounded run-queue depth before new runs are rejected (design doc R4). Wired
   * in step 3; accepted here so the option surface is stable from the scaffold.
   */
  runQueueDepth?: number
  /**
   * Per-block within-block back-pressure bound, in bytes (design doc S1, default
   * 8 MiB). Wired in step 3.
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
 * **Stub.** Returns a lifecycle-clean handle over a bare `node:http` server that
 * 503s every request (no routes are wired yet). The factory exists so downstream
 * (`packages/cli`, tests) can compose against a stable surface from step 2; real
 * routing arrives in steps 3 / 4A / 4B.
 */
export function createServer(_options: CreateServerOptions = {}): RuntimeServer {
  const http: Server = createHttpServer((_req, res) => {
    // No routes wired in the scaffold; every request is "not implemented yet".
    res.statusCode = 503
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'not-implemented', phase: 'scaffold' }))
  })

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
