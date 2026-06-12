/**
 * The s1 HTTP router. Routes the `node:http` request/response pair to a handler.
 *
 * **Phase 2 scope (this card):** `GET /api/project` only — served from the opened
 * {@link Session} with no kernel involvement (KD-6). The `POST /…/run` execute routes and
 * the `/api/stream` WS upgrade land in Phase 3 (`execute-stream-ws`); this module is the
 * extension point they hang off, so it stays a small, pure dispatcher.
 *
 * The router is deliberately framework-free: the package must never drag an HTTP framework
 * (or any frontend toolchain) into the publishable backend (ADR-007). `node:http` plus a
 * tiny method/path match is all the s1 surface needs.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Session } from './session'

/** A JSON error body, matching the design-doc `{ error }` shape. */
interface ErrorBody {
  error: string
}

/** Serialize `body` as JSON with the given status and the JSON content-type. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(payload)
}

/**
 * Handle `GET /api/project`: return the opened project's full envelope (KD-6 — no kernel).
 *
 * A resolution/deserialization failure (an unreadable path or a malformed file captured
 * when the session was opened, or a not-yet-loaded session) maps to `400 { error }` rather
 * than a crash — a missing kernel does **not** fail open (it is a capability flag).
 */
function handleGetProject(res: ServerResponse, session: Session): void {
  try {
    sendJson(res, 200, session.apiProject())
  } catch (err) {
    const error: ErrorBody = { error: err instanceof Error ? err.message : String(err) }
    sendJson(res, 400, error)
  }
}

/**
 * The s1 request router. Built once per server over the opened {@link Session}; dispatches
 * each request by method + path. Unknown routes return `404 { error }`.
 *
 * Returns a `node:http` request listener so {@link createServer} can hand it straight to
 * `createHttpServer`.
 */
export function createRouter(session: Session): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    // `req.url` is a path+query string for an HTTP request; strip the query for matching.
    const path = (req.url ?? '').split('?', 1)[0]
    const method = req.method ?? 'GET'

    if (method === 'GET' && path === '/api/project') {
      handleGetProject(res, session)
      return
    }

    const error: ErrorBody = { error: `Not found: ${method} ${path}` }
    sendJson(res, 404, error)
  }
}
