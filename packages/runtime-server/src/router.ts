/**
 * The s1 HTTP router. Routes the `node:http` request/response pair to a handler.
 *
 * **Phase 2:** `GET /api/project` — served from the opened {@link Session} with no kernel
 * involvement (KD-6). **Phase 3 (this card):** the `POST /…/run` execute routes that enqueue a
 * run onto the server's single {@link RunQueue} (the `/api/stream` WS upgrade lives in
 * `server.ts`). Run routes enqueue and return `202 { runId }` (P1/P2) or `429 { error }` (P3)
 * synchronously; the run's *output* streams over the WS.
 *
 * The router is deliberately framework-free: the package must never drag an HTTP framework
 * (or any frontend toolchain) into the publishable backend (ADR-007). `node:http` plus a
 * tiny method/path match is all the s1 surface needs.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { deepnoteFileSchema } from '@deepnote/blocks'
import type { SaveConflictResponse, SaveProjectRequest, SaveProjectResponse } from './api-types'
import type { RunQueue } from './run-queue'
import { type ServerSession, StartEngineError } from './session'

/** A JSON error body, matching the design-doc `{ error }` shape. */
interface ErrorBody {
  error: string
}

/** An error body that also carries the design-doc {@link KernelFailureCategory} (R5). */
interface FailureBody extends ErrorBody {
  failureCategory: string
}

/** Match `POST /api/notebooks/{nb}/blocks/{id}/run` → `{ notebookName, blockId }` (URL-decoded). */
const BLOCK_RUN_RE = /^\/api\/notebooks\/([^/]+)\/blocks\/([^/]+)\/run$/

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
function handleGetProject(res: ServerResponse, session: ServerSession): void {
  try {
    sendJson(res, 200, session.apiProject())
  } catch (err) {
    const error: ErrorBody = { error: err instanceof Error ? err.message : String(err) }
    sendJson(res, 400, error)
  }
}

/**
 * Handle a run request: ensure the engine is started (the kernel-start failure surfaces here as
 * a typed {@link StartEngineError} → HTTP `{ error, failureCategory }`, KD-5/R5), then enqueue.
 *
 * - **P1/P2** (accepted): `202 { runId }`. The run's *output* streams over the WS — this
 *   response only acknowledges the enqueue.
 * - **P3** (queue full): `429 { error: 'queue-full' }`, **no** WS event.
 *
 * Engine start is awaited *before* enqueue so a missing/unlaunchable kernel is reported on the
 * triggering request (the typed category), not as a silently-dropped run.
 */
async function handleRun(
  res: ServerResponse,
  session: ServerSession,
  queue: RunQueue,
  request: { blockId?: string; notebookName?: string }
): Promise<void> {
  try {
    await session.startEngine()
  } catch (err) {
    if (err instanceof StartEngineError) {
      const body: FailureBody = { error: err.message, failureCategory: err.failureCategory }
      sendJson(res, 500, body)
      return
    }
    const body: ErrorBody = { error: err instanceof Error ? err.message : String(err) }
    sendJson(res, 500, body)
    return
  }

  const result = queue.enqueue(request)
  if (!result.accepted) {
    // P3: bounded backlog is full — reject the NEW request; the queue emits no WS event.
    const body: ErrorBody = { error: 'queue-full' }
    sendJson(res, 429, body)
    return
  }
  sendJson(res, 202, { runId: result.runId })
}

/** Hard cap on a request body (the save payload is a single notebook's JSON). */
const MAX_BODY_BYTES = 256 * 1024 * 1024

/**
 * Read the full request body as a UTF-8 string, bounded by {@link MAX_BODY_BYTES}. The bound
 * prevents an oversized (or slow-loris-streamed) request from buffering unboundedly into memory
 * and OOM-killing the serve process — even on a localhost-trust server, a runaway client write
 * should fail the request, not the host.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        reject(new Error('request body exceeds maximum size'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Handle `POST /api/project/save` (4B — the save-safety gate). Parse the
 * {@link SaveProjectRequest} body, then delegate the atomic write + external-change detection to
 * {@link ServerSession.save}:
 *
 * - committed write → `200 { savedHash, bytesWritten }`;
 * - external change since open → `409 { error:'external-change', currentProject, currentHash }`
 *   with **no write performed** (KD-7);
 * - a malformed/missing body → `400 { error }` (the save never runs);
 * - a no-loaded-project session or a genuine write failure → `500 { error }` (the temp file is
 *   already cleaned up by `saveProject`; the original is untouched).
 */
async function handleSave(res: ServerResponse, session: ServerSession, req: IncomingMessage): Promise<void> {
  let request: SaveProjectRequest
  try {
    const raw = await readBody(req)
    const parsed = JSON.parse(raw) as Partial<SaveProjectRequest>
    if (typeof parsed?.openHash !== 'string' || typeof parsed?.project !== 'object' || parsed.project === null) {
      throw new Error('save body must be { project: DeepnoteFile, openHash: string }')
    }
    // Validate `project` against the canonical schema BEFORE the write. The shallow `typeof object`
    // guard above only proves the field is present; a structurally-invalid `project` (e.g. missing
    // the required `version`) would otherwise reach `serializeDeepnoteFile` and throw a zod error
    // that the write-path try/catch maps to 500, leaking the internal serializer error. A malformed
    // body is a 400 (client error), so parse-then-validate here and surface the schema failure as a
    // 400 — never reaching the atomic write path (no write on a schema-invalid body).
    const validated = deepnoteFileSchema.safeParse(parsed.project)
    if (!validated.success) {
      throw new Error(`save body project is not a valid DeepnoteFile: ${validated.error.message}`)
    }
    request = { project: validated.data, openHash: parsed.openHash }
  } catch (err) {
    const error: ErrorBody = { error: err instanceof Error ? err.message : String(err) }
    sendJson(res, 400, error)
    return
  }

  try {
    const result = await session.save(request)
    if (result.conflict) {
      // KD-7: external change detected — no write happened; hand back the current on-disk content.
      const conflict: SaveConflictResponse = {
        error: 'external-change',
        currentProject: result.currentProject,
        currentHash: result.currentHash,
      }
      sendJson(res, 409, conflict)
      return
    }
    const ok: SaveProjectResponse = { savedHash: result.savedHash, bytesWritten: result.bytesWritten }
    sendJson(res, 200, ok)
  } catch (err) {
    const error: ErrorBody = { error: err instanceof Error ? err.message : String(err) }
    sendJson(res, 500, error)
  }
}

/**
 * The s1 request router. Built once per server over the opened {@link Session} and the single
 * {@link RunQueue}; dispatches each request by method + path. Unknown routes return
 * `404 { error }`.
 *
 * Returns a `node:http` request listener so {@link createServer} can hand it straight to
 * `createHttpServer`. The `queue` is optional so the scaffold/`GET`-only lifecycle path still
 * works without an execution surface; a run route with no queue returns `404`.
 */
export function createRouter(
  session: ServerSession,
  queue?: RunQueue
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    // `req.url` is a path+query string for an HTTP request; strip the query for matching.
    const path = (req.url ?? '').split('?', 1)[0]
    const method = req.method ?? 'GET'

    if (method === 'GET' && path === '/api/project') {
      handleGetProject(res, session)
      return
    }

    if (method === 'POST' && path === '/api/project/save') {
      // The save route is queue-independent (no kernel/engine involved) — it serves the
      // GET+save lifecycle even before any run surface is wired.
      void handleSave(res, session, req)
      return
    }

    if (method === 'POST' && queue) {
      // Run-all: POST /api/project/run.
      if (path === '/api/project/run') {
        void handleRun(res, session, queue, {})
        return
      }
      // Single-block: POST /api/notebooks/{nb}/blocks/{id}/run.
      const match = BLOCK_RUN_RE.exec(path)
      if (match) {
        const [, rawNb, rawBlock] = match
        let notebookName: string
        let blockId: string
        try {
          notebookName = decodeURIComponent(rawNb)
          blockId = decodeURIComponent(rawBlock)
        } catch {
          const error: ErrorBody = { error: 'bad notebook or block id' }
          sendJson(res, 400, error)
          return
        }
        void handleRun(res, session, queue, { notebookName, blockId })
        return
      }
    }

    const error: ErrorBody = { error: `Not found: ${method} ${path}` }
    sendJson(res, 404, error)
  }
}
