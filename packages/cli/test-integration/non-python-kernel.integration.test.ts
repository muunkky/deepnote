import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Real-kernel integration suite — design-doc Sub-phase 1C, the headline (R7) plus
 * the real-server legibility proofs (R2 + R6). These tests drive the REAL built CLI
 * (`packages/cli/dist/bin.js`) against the REAL `deepnote-toolkit` server, launching
 * an actual `bash` Jupyter kernel. They are collected ONLY by
 * `vitest.integration.config.ts` (the default `vitest.config.ts` excludes the
 * `*.integration.test.ts` glob — KD-9) and run ONLY in the `integration-kernels` CI
 * job, which provisions the Python venv (`deepnote-toolkit[server]` + `bash_kernel`).
 *
 * Gating (defense-in-depth): the suite self-SKIPS — never hard-fails — when
 * `RUN_INTEGRATION_TESTS` is unset, or when the built CLI / provisioned venv cannot be
 * found. So a contributor without Python who runs `pnpm test:integration` directly
 * gets skips, not red. The `exclude` glob, not this gate, keeps these out of the
 * always-on mocked `pnpm test`.
 */

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/cli/test-integration -> repo root
const repoRoot = resolve(here, '..', '..', '..')
const cliBin = join(repoRoot, 'packages', 'cli', 'dist', 'bin.js')

/**
 * Resolve the integration venv root. CI sets `DEEPNOTE_INTEGRATION_VENV` (or uses the
 * default `.venv` at repo root) after provisioning `deepnote-toolkit[server]` +
 * `bash_kernel`. The CLI's `--python` accepts a venv root (it resolves `bin/python`).
 */
function resolveVenv(): string | null {
  const explicit = process.env.DEEPNOTE_INTEGRATION_VENV
  const candidates = explicit ? [explicit] : [join(repoRoot, '.venv')]
  for (const candidate of candidates) {
    const root = resolve(candidate)
    if (existsSync(join(root, 'bin', 'python')) || existsSync(join(root, 'Scripts', 'python.exe'))) {
      return root
    }
  }
  return null
}

const venv = resolveVenv()
// `RUN_INTEGRATION_TESTS` is the defense-in-depth runtime gate; the venv + built CLI
// must also be present for a real run. Any missing → skip the whole suite.
const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === 'true' && venv !== null && existsSync(cliBin)

const sourceFixtures = join(here, 'fixtures')
const bashImageSource = join(sourceFixtures, 'bash-image.deepnote')
const pythonRegressionSource = join(repoRoot, 'test-fixtures', 'simple.deepnote')

// The CLI's `run` persists an execution snapshot into a `snapshots/` directory NEXT
// TO the source file. To keep those artifacts out of the repo working tree (and CI's
// `git status`), copy the fixtures into a throwaway temp dir and run from there.
let workDir = ''
let bashImageFixture = ''
let pythonRegressionFixture = ''

interface RunOutcome {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Run the built CLI and capture stdout/stderr/exit code. The CLI exits non-zero on a
 * failed run (e.g. missing kernel → InvalidUsage = 2), so a non-zero exit is data, not
 * a thrown error — normalize both into a {@link RunOutcome}. Runs from the temp
 * {@link workDir} so persisted snapshots never touch the repo.
 */
async function runCli(args: string[]): Promise<RunOutcome> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [cliBin, ...args], {
      cwd: workDir,
      maxBuffer: 32 * 1024 * 1024,
    })
    return { exitCode: 0, stdout, stderr }
  } catch (error) {
    const err = error as { code?: number; stdout?: string; stderr?: string }
    return { exitCode: typeof err.code === 'number' ? err.code : 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' }
  }
}

const describeIntegration = integrationEnabled ? describe : describe.skip

describeIntegration('non-Python kernel — real CLI against real deepnote-toolkit server', () => {
  beforeAll(() => {
    // Surface why the suite is (or isn't) running so a CI skip is never silent.
    // biome-ignore lint/suspicious/noConsole: integration diagnostics belong on the CI log.
    console.log(`[integration] RUN_INTEGRATION_TESTS=${process.env.RUN_INTEGRATION_TESTS} venv=${venv} cliBin=${cliBin}`)

    // Copy fixtures into an isolated temp dir so the CLI's snapshot persistence lands
    // there, not in the repo (the source `snapshots/` dir would otherwise be created
    // next to the committed fixtures).
    workDir = mkdtempSync(join(tmpdir(), 'deepnote-kernel-integration-'))
    bashImageFixture = join(workDir, basename(bashImageSource))
    pythonRegressionFixture = join(workDir, basename(pythonRegressionSource))
    copyFileSync(bashImageSource, bashImageFixture)
    copyFileSync(pythonRegressionSource, pythonRegressionFixture)
  })

  afterAll(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true })
    }
  })

  it('headline (R7): `--kernel bash` returns a non-text/plain image/png MIME bundle', async () => {
    const { exitCode, stdout, stderr } = await runCli([
      'run',
      bashImageFixture,
      '--kernel',
      'bash',
      '--python',
      venv as string,
      '-o',
      'json',
    ])
    expect(exitCode, `CLI failed:\n${stderr}`).toBe(0)

    const result = JSON.parse(stdout) as {
      success: boolean
      blocks: Array<{ outputs: Array<{ output_type?: string; data?: Record<string, unknown> }> }>
    }
    expect(result.success).toBe(true)

    // Collect every MIME key emitted by the bash kernel across all block outputs.
    const mimeKeys = result.blocks.flatMap(block =>
      block.outputs.flatMap(output => (output.data ? Object.keys(output.data) : [])),
    )

    // The headline assertion: a binary, non-text/plain bundle came back through the
    // JSON-only WebSocket transport + IOPub decode against a real non-Python kernel.
    expect(mimeKeys).toContain('image/png')
    expect(mimeKeys.some(key => key !== 'text/plain')).toBe(true)

    // And the bundle is a genuinely decodable PNG (proves the binary IOPub decode,
    // not just a stray MIME label).
    const imageBundle = result.blocks
      .flatMap(block => block.outputs)
      .find(output => output.data && typeof output.data['image/png'] === 'string')
    expect(imageBundle).toBeDefined()
    const pngBase64 = imageBundle?.data?.['image/png'] as string
    const pngBytes = Buffer.from(pngBase64, 'base64')
    expect(pngBytes.subarray(0, 4).toString('binary')).toBe('\x89PNG')
  })

  it('real missing-kernel legibility (R2 + R6): typed listing, failureCategory, never a 500', async () => {
    const { exitCode, stdout } = await runCli([
      'run',
      bashImageFixture,
      '--kernel',
      'no_such_kernel',
      '--python',
      venv as string,
      '-o',
      'json',
    ])
    // A requested-but-unregistered kernel is a usage error, not a crash.
    expect(exitCode).not.toBe(0)

    const result = JSON.parse(stdout) as { success: boolean; error: string; failureCategory?: string }
    expect(result.success).toBe(false)
    expect(result.failureCategory).toBe('missing-kernel')

    // The typed, listing message names the requested kernel and the installed ones —
    // not the server's opaque 500.
    expect(result.error).toContain('no_such_kernel')
    expect(result.error.toLowerCase()).toContain('not registered')
    expect(result.error).toContain('python3')
    expect(result.error).toContain('bash')

    // Explicitly assert the opaque server error never surfaces.
    expect(result.error).not.toContain('500')
    expect(result.error).not.toMatch(/unhandled error/i)
  })

  it('regression: the python3 path still runs an existing fixture green against the real server', async () => {
    const { exitCode, stdout, stderr } = await runCli([
      'run',
      pythonRegressionFixture,
      '--kernel',
      'python3',
      '--python',
      venv as string,
      '-o',
      'json',
    ])
    expect(exitCode, `CLI failed:\n${stderr}`).toBe(0)

    const result = JSON.parse(stdout) as {
      success: boolean
      failedBlocks: number
      blocks: Array<{ success: boolean; outputs: Array<{ output_type?: string; text?: string }> }>
    }
    expect(result.success).toBe(true)
    expect(result.failedBlocks).toBe(0)
    expect(result.blocks.every(block => block.success)).toBe(true)

    // The fixture prints "Hello, World!" and "3" — assert the real kernel produced them.
    const streamText = result.blocks
      .flatMap(block => block.outputs)
      .filter(output => output.output_type === 'stream')
      .map(output => output.text ?? '')
      .join('')
    expect(streamText).toContain('Hello, World!')
  })
})
