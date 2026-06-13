import type { ApiProject } from '@deepnote/runtime-server/types'

// The read-only project loader (design Phase 3, ADR-007 §6, R8).
//
// This is the SPA's single network seam to the s1 backend. It performs ONE `GET
// /api/project` and returns the FULL `ApiProject` envelope — the imported s1 contract type,
// never a re-declared local shape, so a server contract change is a compile error rather
// than silent drift (the `fetchProject.test-d.ts` `expectTypeOf` assertion makes this
// load-bearing). Read-only by design: GET only, no POST and no WebSocket in this story.
//
// The ONLY import from `@deepnote/runtime-server` is the type from its Node-free `/types`
// entry, so this module drags no Node/HTTP/`ws` code into the SPA bundle (R2, enforced by
// `test-helpers/apps-studio-isolation.test.ts`).

/**
 * A typed failure of the project load — a non-2xx HTTP response or a network/parse error.
 *
 * `message` is the **actionable** text the UI shows the user: on a non-2xx it is the s1
 * server's own `{ error }` body (e.g. "deepnote-toolkit not installed"), so the error
 * banner surfaces the server's diagnosis verbatim rather than a generic "request failed".
 * `status` is the HTTP status when one was received, and `undefined` for a
 * pre-response failure (DNS/connection refused/offline) — the discriminant the UI can use
 * to distinguish "server said no" from "couldn't reach the server".
 */
export class ProjectLoadError extends Error {
  /** The HTTP status code, or `undefined` when the request failed before a response. */
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ProjectLoadError'
    this.status = status
    // Restore the prototype chain so `instanceof ProjectLoadError` holds after transpilation
    // to ES targets that break subclassing of built-ins.
    Object.setPrototypeOf(this, ProjectLoadError.prototype)
  }
}

/** The `GET /api/project` path, joined onto an optional base URL. */
const PROJECT_PATH = '/api/project'

/**
 * Pull the s1-surfaced actionable message out of a non-2xx response body.
 *
 * The s1 router returns `{ error: string }` on every error path (`router.ts`). We read that
 * field when present; if the body is missing/unparseable/shapeless we fall back to a
 * status-derived message so the error is never empty.
 */
async function messageFromErrorResponse(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
      return (body as { error: string }).error
    }
  } catch {
    // fall through to the status-derived message
  }
  const statusText = response.statusText ? ` ${response.statusText}` : ''
  return `Project load failed (HTTP ${response.status}${statusText})`
}

/**
 * Fetch the opened project from the s1 server over HTTP.
 *
 * Resolves to the full {@link ApiProject} envelope on a 2xx. Throws {@link ProjectLoadError}
 * on any non-2xx (carrying the s1 `{ error }` message + status) or on a network/parse failure
 * (carrying the underlying message, no status).
 *
 * @param baseUrl Origin to target (default `''` = same-origin). The SPA is normally served
 *   by the same `deepnote serve` process, so the default works; an explicit origin lets a
 *   standalone dev server point at a separately-launched backend.
 */
export async function fetchProject(baseUrl = ''): Promise<ApiProject> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${PROJECT_PATH}`, { method: 'GET' })
  } catch (err) {
    // Pre-response failure: offline, connection refused, DNS, CORS. No status to attach.
    throw new ProjectLoadError(err instanceof Error ? err.message : String(err))
  }

  if (!response.ok) {
    throw new ProjectLoadError(await messageFromErrorResponse(response), response.status)
  }

  try {
    return (await response.json()) as ApiProject
  } catch (err) {
    throw new ProjectLoadError(
      `Project response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      response.status
    )
  }
}
