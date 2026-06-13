import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deserializeDeepnoteFile } from '@deepnote/blocks'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApiProject } from './api-types'
import { createServer, type RuntimeServer } from './server'
import { Session } from './session'

/**
 * HTTP integration test for `GET /api/project` (Phase 2). Binds a real `createServer` over
 * an opened {@link Session} on an OS-assigned port and drives it with `fetch`, asserting the
 * over-the-wire `ApiProject` envelope matches a direct deserialization (the capstone, now
 * proven through the HTTP layer) and that error/unknown routes return the design-doc shapes.
 */

const fixturePath = fileURLToPath(new URL('../test/fixtures/open-project.deepnote', import.meta.url))
const fixtureBytes = readFileSync(fixturePath)

async function startServerForFixture(): Promise<{ server: RuntimeServer; baseUrl: string }> {
  const session = new Session()
  await session.loadProject(fixturePath)
  const server = createServer({ session })
  const port = await server.listen(0)
  return { server, baseUrl: `http://127.0.0.1:${port}` }
}

describe('GET /api/project (HTTP integration)', () => {
  let server: RuntimeServer
  let baseUrl: string

  beforeEach(async () => {
    ;({ server, baseUrl } = await startServerForFixture())
  })

  afterEach(async () => {
    await server.close()
  })

  it('returns 200 with an ApiProject whose tree deep-equals a direct deserialize', async () => {
    const res = await fetch(`${baseUrl}/api/project`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)

    const body = (await res.json()) as ApiProject
    const direct = deserializeDeepnoteFile(fixtureBytes.toString('utf8'))

    expect(body.path).toBe(fixturePath)
    expect(body.metadata).toEqual(direct.metadata)
    expect(body.project).toEqual(direct.project)
    expect(body.openHash).toMatch(/^[0-9a-f]{64}$/)
    expect(body.capabilities).toHaveProperty('kernelLanguage')
    expect(body.capabilities).toHaveProperty('reactivity', 'disabled')
  })

  it('persisted block outputs survive the HTTP round-trip', async () => {
    const res = await fetch(`${baseUrl}/api/project`)
    const body = (await res.json()) as ApiProject
    const codeBlock = body.project.notebooks[0]?.blocks.find(b => b.type === 'code')
    expect(codeBlock?.outputs).toEqual([
      { output_type: 'stream', name: 'stdout', text: 'hello from a persisted run\n' },
    ])
  })

  it('unknown routes return 404 { error }', async () => {
    const res = await fetch(`${baseUrl}/api/nope`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toContain('Not found')
  })

  it('a non-GET method on /api/project returns 404 (read-only surface in s1)', async () => {
    const res = await fetch(`${baseUrl}/api/project`, { method: 'POST' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/project error path (bad project → 400)', () => {
  it('a session that failed to load surfaces 400 { error }, not a crash', async () => {
    // Simulate the bad-path branch at the HTTP boundary: a Session whose `apiProject()`
    // throws (never loaded) must map to 400, exactly as a deserialization failure would.
    const server = createServer({ session: new Session() })
    const port = await server.listen(0)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/project`)
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string }
      expect(typeof body.error).toBe('string')
      expect(body.error.length).toBeGreaterThan(0)
    } finally {
      await server.close()
    }
  })
})
