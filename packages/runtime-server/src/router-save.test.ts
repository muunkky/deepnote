/**
 * HTTP integration test for `POST /api/project/save` (step 4B). Binds a real `createServer` over an
 * opened {@link Session} on an OS-assigned port and drives it with `fetch`, asserting the route maps
 * {@link Session.save}'s result onto the design-doc wire shapes: `200 { savedHash, bytesWritten }`,
 * `409 { error:'external-change', currentProject, currentHash }` (no write), and `400 { error }` on a
 * malformed body. The session's own copy of the fixture is mutated on disk to simulate an external
 * editor for the 409 case.
 */

import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deserializeDeepnoteFile, serializeDeepnoteFile } from '@deepnote/blocks'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DeepnoteFile } from '@deepnote/blocks'
import type { ApiProject, SaveConflictResponse, SaveProjectResponse } from './api-types'
import { createServer, type RuntimeServer } from './server'
import { Session } from './session'

const FIXTURE = fileURLToPath(new URL('../../cli/test-integration/fixtures/bash-image.deepnote', import.meta.url))
const fixtureText = readFileSync(FIXTURE, 'utf8')
const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex')

/**
 * The full `DeepnoteFile` a save client posts. In s1 there is no editor yet, so the test reconstructs
 * the complete persisted file from the on-disk bytes (every save body is a full `DeepnoteFile`, not an
 * `ApiProject` — see `save-api-open-contract-gap` follow-up: `ApiProject` does not yet carry the
 * `version`/`environment`/`execution` fields a save needs).
 */
const fullFile = (): DeepnoteFile => deserializeDeepnoteFile(fixtureText)

let dir: string
let target: string
let server: RuntimeServer
let baseUrl: string

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'router-save-'))
  target = join(dir, 'project.deepnote')
  writeFileSync(target, fixtureText, 'utf8')
  const session = new Session()
  await session.loadProject(target)
  server = createServer({ session })
  const port = await server.listen(0)
  baseUrl = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  await server.close()
  rmSync(dir, { recursive: true, force: true })
})

/** Read `GET /api/project` to obtain the live `openHash`/`project` the client would echo on save. */
async function openProject(): Promise<ApiProject> {
  const res = await fetch(`${baseUrl}/api/project`)
  expect(res.status).toBe(200)
  return (await res.json()) as ApiProject
}

describe('POST /api/project/save (HTTP integration)', () => {
  it('200 { savedHash, bytesWritten } on a valid save; the on-disk bytes become canonical', async () => {
    const open = await openProject()
    const res = await fetch(`${baseUrl}/api/project/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: fullFile(), openHash: open.openHash }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as SaveProjectResponse
    const onDisk = readFileSync(target, 'utf8')
    expect(body.savedHash).toBe(sha256(onDisk))
    expect(body.bytesWritten).toBe(Buffer.byteLength(onDisk, 'utf8'))
    expect(onDisk).toBe(serializeDeepnoteFile(deserializeDeepnoteFile(fixtureText)))
  })

  it('a second no-op save through the API produces an empty diff (idempotent)', async () => {
    const open = await openProject()
    const first = await fetch(`${baseUrl}/api/project/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: fullFile(), openHash: open.openHash }),
    })
    expect(first.status).toBe(200)
    const afterFirst = readFileSync(target, 'utf8')

    // Re-open to pick up the session's new openHash, then save the canonical project again.
    const reopened = await openProject()
    const second = await fetch(`${baseUrl}/api/project/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: deserializeDeepnoteFile(afterFirst), openHash: reopened.openHash }),
    })
    expect(second.status).toBe(200)
    expect(readFileSync(target, 'utf8')).toBe(afterFirst) // empty diff
  })

  it('409 { error:external-change, currentProject, currentHash } with NO write on hash mismatch', async () => {
    const open = await openProject()
    // An external editor rewrites the file after open, changing its hash.
    const intruderText = serializeDeepnoteFile(deserializeDeepnoteFile(fixtureText))
    writeFileSync(target, intruderText, 'utf8')

    const res = await fetch(`${baseUrl}/api/project/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: fullFile(), openHash: open.openHash }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as SaveConflictResponse
    expect(body.error).toBe('external-change')
    expect(body.currentHash).toBe(sha256(intruderText))
    expect(body.currentProject).toEqual(deserializeDeepnoteFile(intruderText))
    // No clobber: the intruder's bytes are still on disk.
    expect(readFileSync(target, 'utf8')).toBe(intruderText)
  })

  it('400 { error } on a malformed body (the save never runs)', async () => {
    const before = readFileSync(target, 'utf8')
    const res = await fetch(`${baseUrl}/api/project/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
    // Unchanged on disk — a bad request never reaches the write path.
    expect(readFileSync(target, 'utf8')).toBe(before)
  })

  it('400 when the body is valid JSON but missing openHash/project', async () => {
    const res = await fetch(`${baseUrl}/api/project/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: {} }), // no openHash
    })
    expect(res.status).toBe(400)
  })
})
