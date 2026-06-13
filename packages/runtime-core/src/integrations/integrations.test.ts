import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DeepnoteFile } from '@deepnote/blocks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectRequiredIntegrationIds,
  getDefaultIntegrationsFilePath,
  injectIntegrationEnvVars,
  parseIntegrationsFile,
  resolveIntegrationEnv,
} from './index'

/**
 * KD-3 long-route-lift tests. These prove the integration env helpers — formerly
 * cli-private — now live in `@deepnote/runtime-core` and behave identically (a pure
 * relocation), and that the shared {@link resolveIntegrationEnv} wiring is **local-first**:
 * no fetcher ⇒ no augmentation, exactly the local file's integrations.
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

describe('runtime-core integration helpers (KD-3 lift — pure relocation)', () => {
  let tempDir: string
  const savedEnv = { ...process.env }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'rc-integrations-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    // Restore env so injection side effects don't leak between tests.
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key]
    }
    Object.assign(process.env, savedEnv)
    vi.restoreAllMocks()
  })

  it('parseIntegrationsFile reads + validates a pgsql integration (same as the cli original)', async () => {
    const filePath = getDefaultIntegrationsFilePath(tempDir)
    writeFileSync(filePath, PGSQL_FILE)

    const result = await parseIntegrationsFile(filePath)

    expect(result.issues).toEqual([])
    expect(result.integrations).toHaveLength(1)
    expect(result.integrations[0].id).toBe('my-postgres')
    expect(result.integrations[0].type).toBe('pgsql')
  })

  it('parseIntegrationsFile returns empty (no issues) when the file is absent', async () => {
    const result = await parseIntegrationsFile(join(tempDir, 'does-not-exist.yaml'))
    expect(result.integrations).toEqual([])
    expect(result.issues).toEqual([])
  })

  it('collectRequiredIntegrationIds picks external SQL ids, drops built-ins', () => {
    const external = collectRequiredIntegrationIds(sqlProject('my-postgres'))
    expect(external).toEqual(['my-postgres'])

    const builtin = collectRequiredIntegrationIds(sqlProject('deepnote-dataframe-sql'))
    expect(builtin).toEqual([])
  })

  it('injectIntegrationEnvVars sets process.env and returns the injected names', () => {
    const names = injectIntegrationEnvVars(
      [
        {
          type: 'pgsql',
          id: 'my-postgres',
          name: 'My PostgreSQL',
          metadata: { host: 'localhost', port: '5432', database: 'mydb', user: 'root', password: 'my-secret' },
        },
      ],
      tempDir
    )
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      expect(process.env[name]).toBeDefined()
    }
  })

  it('injectIntegrationEnvVars on an empty set is a no-op (no env mutation, no names)', () => {
    const before = { ...process.env }
    const names = injectIntegrationEnvVars([], tempDir)
    expect(names).toEqual([])
    expect(process.env).toEqual(before)
  })
})

describe('resolveIntegrationEnv — shared wiring, local-first (Phase 8 capstone)', () => {
  let tempDir: string
  const savedEnv = { ...process.env }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'rc-resolve-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key]
    }
    Object.assign(process.env, savedEnv)
    vi.restoreAllMocks()
  })

  it('LOCAL-FIRST: with no fetcher, the resolved set is exactly the local file (no augmentation)', async () => {
    writeFileSync(getDefaultIntegrationsFilePath(tempDir), PGSQL_FILE)

    const result = await resolveIntegrationEnv({
      file: sqlProject('my-postgres'),
      workingDirectory: tempDir,
    })

    expect(result.requiredIds).toEqual(['my-postgres'])
    expect(result.integrations.map(i => i.id)).toEqual(['my-postgres'])
    expect(result.injectedEnvVarNames.length).toBeGreaterThan(0)
  })

  it('LOCAL-FIRST: with NO fetcher, NOTHING calls the network — global fetch is never invoked', async () => {
    writeFileSync(getDefaultIntegrationsFilePath(tempDir), PGSQL_FILE)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await resolveIntegrationEnv({
      file: sqlProject('my-postgres'),
      workingDirectory: tempDir,
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('the fetcher is the ONLY augmentation seam — it is invoked with the local set + required ids', async () => {
    writeFileSync(getDefaultIntegrationsFilePath(tempDir), PGSQL_FILE)
    const fetcher = vi.fn(async ({ localIntegrations }: { localIntegrations: unknown[] }) => localIntegrations as never)

    const result = await resolveIntegrationEnv({
      file: sqlProject('my-postgres'),
      workingDirectory: tempDir,
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith({
      localIntegrations: result.integrations,
      requiredIds: ['my-postgres'],
    })
  })

  it('resolveIntegrationEnv parses the file at the default path and surfaces parse issues', async () => {
    writeFileSync(getDefaultIntegrationsFilePath(tempDir), 'integrations: "not an array"')

    const result = await resolveIntegrationEnv({
      file: sqlProject('my-postgres'),
      workingDirectory: tempDir,
    })

    expect(result.integrations).toEqual([])
    expect(result.issues.length).toBeGreaterThan(0)
  })
})
