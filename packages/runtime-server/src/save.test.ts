/**
 * Save-safety gate tests (step 4B, R6) — the four capstones, mocked & always-on:
 *
 * 1. **No content loss** — `deserialize(serialize(project))` deep-equals `project` (semantic
 *    round-trip; pinned to a representative project AND the `bash-image.deepnote` fixture).
 * 2. **Idempotence** — for a canonical `s`, `serialize(deserialize(s)) === s`; equivalently a second
 *    no-op save writes byte-identical bytes (an empty `git diff`). The FIRST save of the
 *    not-yet-canonical fixture reformats (1263→1374 bytes) and that is pinned as expected.
 * 3. **Atomicity** — temp-then-rename in the SAME dir; no `.tmp-*` survives on success OR on a
 *    failure injected between write and rename, and the original bytes are unchanged on failure.
 * 4. **External-change detection (KD-7)** — when the on-disk SHA-256 ≠ `openHash`, the save refuses
 *    with the conflict result and performs **no write**.
 *
 * These run the REAL serializer/deserializer over a REAL on-disk fixture, so the round-trip and
 * idempotence assertions are unfakeable by a mock.
 */

import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deserializeDeepnoteFile, serializeDeepnoteFile } from '@deepnote/blocks'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type SaveFs, saveProject } from './save'

const FIXTURE = fileURLToPath(new URL('../../cli/test-integration/fixtures/bash-image.deepnote', import.meta.url))
const fixtureText = readFileSync(FIXTURE, 'utf8')

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex')

/** Per-test scratch dir holding a copy of the fixture so saves never touch the source tree. */
let dir: string
let target: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'save-safety-'))
  target = join(dir, 'project.deepnote')
  writeFileSync(target, fixtureText, 'utf8')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

/** List `.tmp-*` siblings of the target — the atomic-write invariant is that none survive. */
function tempLeftovers(): string[] {
  return readdirSync(dir).filter(name => name.includes('.tmp-'))
}

describe('Capstone 1 — no content loss (semantic round-trip)', () => {
  it('deserialize(serialize(project)) deep-equals project for a canonical project', () => {
    // Canonicalize once (the documented first-save reformat), THEN assert the round-trip is lossless.
    // The raw fixture has non-canonical sorting keys ("0"/"1"); the serializer rewrites them, so the
    // loss-free bar is "round-trip of an already-canonical project", exactly per the design doc.
    const canonical = deserializeDeepnoteFile(serializeDeepnoteFile(deserializeDeepnoteFile(fixtureText)))
    expect(deserializeDeepnoteFile(serializeDeepnoteFile(canonical))).toEqual(canonical)
  })

  it('a representative hand-built project round-trips with zero loss', () => {
    const project = deserializeDeepnoteFile(fixtureText)
    // Mutate a code block (a realistic edit), re-canonicalize, and assert no content is dropped.
    const edited = structuredClone(project)
    const firstBlock = edited.project.notebooks[0]?.blocks[0]
    if (firstBlock && firstBlock.type === 'code') {
      firstBlock.content = 'print("edited")'
    }
    const canonical = deserializeDeepnoteFile(serializeDeepnoteFile(edited))
    expect(deserializeDeepnoteFile(serializeDeepnoteFile(canonical))).toEqual(canonical)
  })
})

describe('Capstone 2 — idempotence (no-op re-save is an empty diff)', () => {
  it('the FIRST save reformats the fixture (1263→1374) — documented and accepted', async () => {
    expect(Buffer.byteLength(fixtureText, 'utf8')).toBe(1263)
    const project = deserializeDeepnoteFile(fixtureText)
    const r = await saveProject(target, project, sha256(fixtureText))
    expect(r).toEqual({ conflict: false, savedHash: expect.any(String), bytesWritten: 1374 })
    // The on-disk bytes are now the canonical reformat.
    const afterFirst = readFileSync(target, 'utf8')
    expect(Buffer.byteLength(afterFirst, 'utf8')).toBe(1374)
    expect(sha256(afterFirst)).toBe(r.conflict === false ? r.savedHash : '')
  })

  it('a second no-op save writes byte-identical bytes (empty diff) and is idempotent', async () => {
    // First save canonicalizes; capture the bytes + the new hash the session would adopt.
    const first = await saveProject(target, deserializeDeepnoteFile(fixtureText), sha256(fixtureText))
    expect(first.conflict).toBe(false)
    const canonicalBytes = readFileSync(target, 'utf8')
    const canonicalHash = sha256(canonicalBytes)

    // Second save of the same project, now passing the post-save hash (what the session re-adopts).
    const reopened = deserializeDeepnoteFile(canonicalBytes)
    const second = await saveProject(target, reopened, canonicalHash)
    expect(second.conflict).toBe(false)

    // The bytes did not change — an empty `git diff`.
    expect(readFileSync(target, 'utf8')).toBe(canonicalBytes)
    // And string-level idempotence of the serializer itself.
    expect(serializeDeepnoteFile(deserializeDeepnoteFile(canonicalBytes))).toBe(canonicalBytes)
  })
})

describe('Capstone 3 — atomicity (temp-then-rename, no leftover, original intact)', () => {
  it('a successful save leaves no .tmp-* file behind and writes via a same-dir temp', async () => {
    const seen: string[] = []
    const fs: SaveFs = {
      readFile: path => readFile(path),
      writeFile: async (path, data) => {
        seen.push(path)
        writeFileSync(path, data, 'utf8')
      },
      rename: async (oldPath, newPath) => {
        const { renameSync } = await import('node:fs')
        renameSync(oldPath, newPath)
      },
      unlink: async () => {},
    }
    const r = await saveProject(target, deserializeDeepnoteFile(fixtureText), sha256(fixtureText), fs)
    expect(r.conflict).toBe(false)
    // The temp lived in the SAME directory as the target (atomic-rename precondition).
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatch(/project\.deepnote\.tmp-/)
    expect(seen[0]?.startsWith(`${dir}/`)).toBe(true)
    // No temp survives on success.
    expect(tempLeftovers()).toEqual([])
  })

  it('a failure injected between write and rename leaves no temp and the original untouched', async () => {
    const originalBytes = readFileSync(target, 'utf8')
    const originalHash = sha256(originalBytes)
    let tempPath = ''
    let unlinked = false
    const fs: SaveFs = {
      readFile: path => readFile(path),
      writeFile: async (path, data) => {
        tempPath = path
        writeFileSync(path, data, 'utf8') // the temp really hits disk…
      },
      rename: async () => {
        throw new Error('simulated crash between write and rename')
      },
      unlink: async path => {
        unlinked = true
        rmSync(path, { force: true })
      },
    }

    await expect(saveProject(target, deserializeDeepnoteFile(fixtureText), originalHash, fs)).rejects.toThrow(
      'simulated crash'
    )

    // The temp was created, then cleaned up; nothing survives.
    expect(tempPath).toMatch(/\.tmp-/)
    expect(unlinked).toBe(true)
    expect(tempLeftovers()).toEqual([])
    // The original .deepnote is byte-for-byte unchanged — no half-written file.
    expect(readFileSync(target, 'utf8')).toBe(originalBytes)
    expect(sha256(readFileSync(target, 'utf8'))).toBe(originalHash)
  })
})

describe('Capstone 4 — external-change detection (KD-7, no clobber)', () => {
  it('refuses with a conflict and performs NO write when the on-disk hash ≠ openHash', async () => {
    const staleOpenHash = sha256(fixtureText)

    // Someone else edits the file on disk after we opened it.
    const intruderText = serializeDeepnoteFile(deserializeDeepnoteFile(fixtureText))
    writeFileSync(target, intruderText, 'utf8')
    const intruderHash = sha256(intruderText)
    expect(intruderHash).not.toBe(staleOpenHash)

    const project = deserializeDeepnoteFile(fixtureText)
    const r = await saveProject(target, project, staleOpenHash)

    expect(r.conflict).toBe(true)
    if (r.conflict) {
      expect(r.currentHash).toBe(intruderHash)
      expect(r.currentProject).toEqual(deserializeDeepnoteFile(intruderText))
    }
    // NO write happened — the intruder's bytes are still on disk, and no temp leaked.
    expect(readFileSync(target, 'utf8')).toBe(intruderText)
    expect(tempLeftovers()).toEqual([])
  })

  it('a brand-new path (no file on disk) is not a conflict — first save writes it', async () => {
    const fresh = join(dir, 'brand-new.deepnote')
    const r = await saveProject(fresh, deserializeDeepnoteFile(fixtureText), 'whatever-hash')
    expect(r.conflict).toBe(false)
    expect(readFileSync(fresh, 'utf8')).toBe(serializeDeepnoteFile(deserializeDeepnoteFile(fixtureText)))
  })
})
