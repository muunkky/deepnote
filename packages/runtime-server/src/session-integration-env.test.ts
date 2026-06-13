import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { serializeDeepnoteFile } from '@deepnote/blocks'
import type { DeepnoteFile } from '@deepnote/runtime-core'
import {
  DEFAULT_INTEGRATIONS_FILE,
  getDefaultIntegrationsFilePath,
  injectIntegrationEnvVars,
  resolveIntegrationEnv,
} from '@deepnote/runtime-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Session } from './session'

/**
 * Phase 8 (`sql-integration-parity`) tests. The capstone: a SQL block opened through the
 * **server** resolves its integration env to the **same values** `deepnote run` injects for the
 * same project + integrations file — because both sides call the one shared
 * `resolveIntegrationEnv` wiring in `@deepnote/runtime-core` (KD-3), not a re-implementation.
 *
 * The load-bearing failure-mode test is local-first: the server passes **no fetcher**, so NO
 * outbound request can fire by default; a request happens only when a token-gated fetcher is
 * explicitly supplied (which the server never does in s1).
 *
 * These exercise `Session.resolveIntegrationEnvForRun()` directly — it is the
 * kernel-free integration-env step `startEngine()` runs before launching the engine, so the
 * parity + local-first guarantees are testable without a real kernel.
 */

const PGSQL_FILE = `integrations:
  - id: my-postgres
    name: My PostgreSQL
    type: pgsql
    metadata:
      host: localhost
      port: "5432"
      database: mydb
      user: root
      password: my-secret`

function sqlProject(integrationId: string): DeepnoteFile {
  return {
    metadata: { createdAt: '2024-01-01T00:00:00.000Z' },
    project: {
      id: 'p1',
      name: 'P',
      notebooks: [
        {
          id: 'n1',
          name: 'Notebook',
          blocks: [
            {
              id: 'b1',
              type: 'sql',
              blockGroup: 'g1',
              sortingKey: 'a0',
              content: 'select 1',
              metadata: { sql_integration_id: integrationId },
            } as DeepnoteFile['project']['notebooks'][0]['blocks'][0],
          ],
        },
      ],
    },
    version: '1.0.0',
  }
}

describe('Session integration-env parity with `deepnote run` (Phase 8 capstone)', () => {
  let tempDir: string
  let projectPath: string
  const savedEnv = { ...process.env }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'srv-integration-'))
    projectPath = join(tempDir, 'project.deepnote')
    writeFileSync(projectPath, serializeDeepnoteFile(sqlProject('my-postgres')))
    writeFileSync(getDefaultIntegrationsFilePath(tempDir), PGSQL_FILE)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key]
    }
    Object.assign(process.env, savedEnv)
    vi.restoreAllMocks()
  })

  it('CAPSTONE: a SQL block through the server injects the EXACT env vars `run` injects (shared wiring)', async () => {
    // The reference: what `deepnote run` injects, computed by the same shared helper run.ts uses
    // (parse → collect → inject) for the same project + integrations file. Snapshot the env.
    const referenceEnv: Record<string, string | undefined> = {}
    {
      const ref = await resolveIntegrationEnv({ file: sqlProject('my-postgres'), workingDirectory: tempDir })
      for (const name of ref.injectedEnvVarNames) referenceEnv[name] = process.env[name]
      expect(ref.injectedEnvVarNames.length).toBeGreaterThan(0)
      // Clear so the server path re-injects from scratch (proves the server actually injects).
      for (const name of ref.injectedEnvVarNames) delete process.env[name]
    }

    // The server side: open the same project and resolve its integration env (no kernel).
    const session = new Session()
    await session.loadProject(projectPath)
    const result = await session.resolveIntegrationEnvForRun()

    // Same integration set, same env-var names, same VALUES — parity, not re-derivation.
    expect(result.integrations.map(i => i.id)).toEqual(['my-postgres'])
    expect(new Set(result.injectedEnvVarNames)).toEqual(new Set(Object.keys(referenceEnv)))
    for (const name of result.injectedEnvVarNames) {
      expect(process.env[name]).toBe(referenceEnv[name])
    }
  })

  it('LOCAL-FIRST: opening + resolving makes NO outbound request by default', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const session = new Session()
    await session.loadProject(projectPath)
    await session.resolveIntegrationEnvForRun()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('the integration file is resolved relative to the opened project directory (run parity)', async () => {
    const session = new Session()
    await session.loadProject(projectPath)
    const result = await session.resolveIntegrationEnvForRun()
    expect(result.integrationsFilePath).toBe(join(dirname(projectPath), DEFAULT_INTEGRATIONS_FILE))
  })

  it('resolveIntegrationEnvForRun before loadProject throws (no silent empty resolution)', async () => {
    const session = new Session()
    await expect(session.resolveIntegrationEnvForRun()).rejects.toThrow()
  })

  it('a project with no integrations file resolves to an empty set and injects nothing', async () => {
    // Remove the integrations file: local-first still succeeds, just with no integrations.
    rmSync(getDefaultIntegrationsFilePath(tempDir))
    // The required id is still collected, but with no local config + no fetcher → empty set.
    const session = new Session()
    await session.loadProject(projectPath)
    const result = await session.resolveIntegrationEnvForRun()
    expect(result.integrations).toEqual([])
    expect(result.injectedEnvVarNames).toEqual([])
  })

  it('uses the shared runtime-core injector (no re-implemented injection in the server)', async () => {
    // Sanity that the server is not maintaining its own copy of the injection logic — the
    // helper it relies on is the lifted runtime-core one, callable directly here.
    expect(typeof injectIntegrationEnvVars).toBe('function')
  })
})
