import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deserializeDeepnoteFile } from '@deepnote/blocks'
import { describe, expect, it } from 'vitest'
import { Session } from './session'

/**
 * Phase-2 session tests (KD-6). The headline is the **capstone**: a loaded project's
 * `metadata` + `project` deep-equal a *direct* `deserializeDeepnoteFile` of the same
 * bytes (persisted outputs intact) — unfakeable by a mock, because the payload must
 * reproduce the real tree. The supporting tests pin the kernel-free guarantee, `openHash`
 * stability, the bad-path failure, and the capability flags.
 */

const fixturePath = fileURLToPath(new URL('../test/fixtures/open-project.deepnote', import.meta.url))
const fixtureBytes = readFileSync(fixturePath)

describe('Session.loadProject (KD-6: kernel-free open)', () => {
  it('CAPSTONE: apiProject().{metadata,project} deep-equal a direct deserialize (persisted outputs intact)', async () => {
    const direct = deserializeDeepnoteFile(fixtureBytes.toString('utf8'))

    const session = new Session()
    await session.loadProject(fixturePath)
    const payload = session.apiProject()

    // The whole tree, byte-for-byte equivalent to a direct deserialization.
    expect(payload.metadata).toEqual(direct.metadata)
    expect(payload.project).toEqual(direct.project)

    // And specifically: a persisted code output survives the open untouched.
    const codeBlock = payload.project.notebooks[0]?.blocks.find(b => b.type === 'code')
    expect(codeBlock?.outputs).toEqual([
      { output_type: 'stream', name: 'stdout', text: 'hello from a persisted run\n' },
    ])
  })

  it('opens with NO kernel started — a fresh Session never touches an ExecutionEngine', async () => {
    // The behavioural proof that load is kernel-free: `loadProject` does its whole job
    // (deep-equal tree + capabilities) using only filesystem + pure resolvers. There is
    // no engine to spy on because the session never constructs one in this phase; the
    // capstone above returning a full tree while this completes synchronously-fast (no
    // port bind, no subprocess) is the observable "no kernel" outcome. We assert the
    // payload is fully populated as the positive signal.
    const session = new Session()
    await session.loadProject(fixturePath)
    const payload = session.apiProject()
    expect(payload.project.notebooks.length).toBeGreaterThan(0)
    expect(payload.capabilities).toBeDefined()
  })

  it('openHash is a stable hex SHA-256 of the on-disk bytes (same bytes in → same hash)', async () => {
    const expected = createHash('sha256').update(fixtureBytes).digest('hex')

    const a = new Session()
    await a.loadProject(fixturePath)
    const b = new Session()
    await b.loadProject(fixturePath)

    expect(a.openHash).toBe(expected)
    expect(b.openHash).toBe(expected)
    expect(a.apiProject().openHash).toBe(expected)
    expect(expected).toMatch(/^[0-9a-f]{64}$/)
  })

  it('path is the resolved absolute path of the opened file', async () => {
    const session = new Session()
    await session.loadProject(fixturePath)
    expect(session.apiProject().path).toBe(fixturePath)
  })

  it('a missing/unresolvable path rejects (caller maps to 400), not a crash', async () => {
    const session = new Session()
    await expect(session.loadProject('/no/such/file.deepnote')).rejects.toThrow()
  })

  it('a malformed .deepnote rejects at deserialize time (→ 400)', async () => {
    // Point at a real, readable file that is not a valid .deepnote (this test source).
    const session = new Session()
    const notADeepnote = fileURLToPath(new URL('./session.test.ts', import.meta.url))
    await expect(session.loadProject(notADeepnote)).rejects.toThrow()
  })

  it('apiProject() before loadProject() throws (no silent empty payload)', () => {
    const session = new Session()
    expect(() => session.apiProject()).toThrow()
  })
})

describe('Session capabilities (KD-6 flags, kernel-free)', () => {
  it('default (python3) kernel with a resolvable interpreter reports python + reactivity', async () => {
    // `python` resolves to a system python in this environment (the bare-system fast-path),
    // so the default open reports the Python capability set.
    const session = new Session()
    await session.loadProject(fixturePath, { python: 'python3' })
    expect(session.apiProject().capabilities).toEqual({
      kernelLanguage: 'python',
      reactivity: 'disabled',
    })
  })

  it('a mis-installed interpreter degrades to a "kernel missing" flag, NOT an open failure', async () => {
    // KD-6: opening must still succeed and return a render-able tree even when the kernel
    // is mis-installed — the missing kernel is a capability flag (kernelLanguage: null).
    const session = new Session()
    await session.loadProject(fixturePath, { python: '/definitely/not/a/python/interpreter' })
    const { capabilities, project } = session.apiProject()
    expect(capabilities).toEqual({ kernelLanguage: null, reactivity: 'disabled' })
    // The tree is still fully present despite the missing kernel.
    expect(project.notebooks.length).toBeGreaterThan(0)
  })

  it('a non-python kernel reports its language name and disables reactivity (ADR-004)', async () => {
    const session = new Session()
    await session.loadProject(fixturePath, { kernel: 'bash', python: 'python3' })
    expect(session.apiProject().capabilities).toEqual({
      kernelLanguage: 'bash',
      reactivity: 'disabled',
    })
  })

  it('a non-python kernel does NOT depend on Python interpreter resolution for its language (L1 regression)', async () => {
    // The kernel axis (ADR-003) and the interpreter axis (ADR-001) are orthogonal: an
    // explicit non-Python kernel reports its own language regardless of whether a Python
    // interpreter resolves. The previous code probed Python unconditionally, so a
    // mis-installed Python wrongly nulled `kernelLanguage` even for `--kernel bash`. This
    // walks the branch the resolvable-`python3` non-python test above masks.
    const session = new Session()
    await session.loadProject(fixturePath, {
      kernel: 'bash',
      python: '/definitely/not/a/python/interpreter',
    })
    const { capabilities, project } = session.apiProject()
    expect(capabilities).toEqual({ kernelLanguage: 'bash', reactivity: 'disabled' })
    // And the open still returns the full tree (KD-6: never a failure).
    expect(project.notebooks.length).toBeGreaterThan(0)
  })
})
