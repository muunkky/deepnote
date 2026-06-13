import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import { fetchProject, ProjectLoadError } from './fetchProject'

// Runtime behaviour of the read-only project loader (design Phase 3, R8: GET only).
//
// `fetchProject` is the single network seam: it GETs `/api/project`, returns the parsed
// `ApiProject` envelope on a 2xx, and throws a typed `ProjectLoadError` on every other
// outcome (non-2xx with the s1-surfaced `{ error }` message, or a network/parse failure).
// The COMPILE-TIME drift-catch — that the return type IS the imported `ApiProject` — lives
// in `fetchProject.test-d.ts`; here we only exercise runtime control flow against a stubbed
// `fetch`, so the suite stays Node-free and never opens a real socket.

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Stub `globalThis.fetch` with a single canned `Response`-like object. */
function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => response as unknown as Response)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('fetchProject', () => {
  it('GETs /api/project and returns the parsed ApiProject envelope on a 2xx', async () => {
    const fn = stubFetch({ ok: true, status: 200, json: async () => sampleProject })

    const result = await fetchProject('')

    expect(result).toEqual(sampleProject)
    // Read-only: the one request is a GET (no method override defaults to GET).
    expect(fn).toHaveBeenCalledTimes(1)
    const [url, init] = fn.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toBe('/api/project')
    expect(init?.method ?? 'GET').toBe('GET')
  })

  it('honours a baseUrl so the SPA can target a non-same-origin server', async () => {
    const fn = stubFetch({ ok: true, status: 200, json: async () => sampleProject })

    await fetchProject('http://127.0.0.1:9999')

    const [url] = fn.mock.calls[0] as [string]
    expect(url).toBe('http://127.0.0.1:9999/api/project')
  })

  it('throws a typed ProjectLoadError carrying the s1-surfaced message on a non-2xx', async () => {
    stubFetch({
      ok: false,
      status: 400,
      json: async () => ({ error: 'deepnote-toolkit not installed' }),
    })

    await expect(fetchProject('')).rejects.toBeInstanceOf(ProjectLoadError)
    await expect(fetchProject('')).rejects.toMatchObject({
      status: 400,
      message: 'deepnote-toolkit not installed',
    })
  })

  it('falls back to a status-derived message when the error body has no { error }', async () => {
    stubFetch({ ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({}) })

    await expect(fetchProject('')).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('500'),
    })
  })

  it('wraps a network failure in a ProjectLoadError (no status)', async () => {
    const fn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fn)

    const error = await fetchProject('').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ProjectLoadError)
    expect((error as ProjectLoadError).status).toBeUndefined()
    expect((error as ProjectLoadError).message).toContain('Failed to fetch')
  })

  it('wraps an unparseable success body in a ProjectLoadError', async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token')
      },
    })

    await expect(fetchProject('')).rejects.toBeInstanceOf(ProjectLoadError)
  })
})
