import { execSync } from 'node:child_process'
import { chmod, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildPythonEnv,
  detectDefaultPython,
  resolvePythonExecutable,
  selectPythonSpec,
  selectPythonSpecWithHint,
} from './python-env'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

describe('resolvePythonExecutable', () => {
  let tempDir: string
  let venvDir: string
  let binDir: string
  let pythonPath: string

  beforeAll(async () => {
    tempDir = join(tmpdir(), `python-env-test-${Date.now()}`)
    venvDir = join(tempDir, 'venv')
    binDir = join(venvDir, 'bin')
    await mkdir(binDir, { recursive: true })

    // Create mock python executable
    pythonPath = join(binDir, 'python')
    await writeFile(pythonPath, '#!/bin/bash\necho "mock python"')
    await chmod(pythonPath, 0o755)
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('system python fallback', () => {
    it('returns "python" as-is when passed "python"', async () => {
      const result = await resolvePythonExecutable('python')
      expect(result).toBe('python')
    })

    it('returns "python3" as-is when passed "python3"', async () => {
      const result = await resolvePythonExecutable('python3')
      expect(result).toBe('python3')
    })

    it('returns "python3.11" as-is when passed "python3.11"', async () => {
      const result = await resolvePythonExecutable('python3.11')
      expect(result).toBe('python3.11')
    })
  })

  describe('direct executable path', () => {
    it('returns the executable path when passed directly', async () => {
      const result = await resolvePythonExecutable(pythonPath)
      expect(result).toBe(pythonPath)
    })

    it('accepts python3 executable path', async () => {
      const python3Path = join(binDir, 'python3')
      await writeFile(python3Path, '#!/bin/bash\necho "mock python3"')
      await chmod(python3Path, 0o755)

      const result = await resolvePythonExecutable(python3Path)
      expect(result).toBe(python3Path)
    })

    it('throws error for non-python executable', async () => {
      const otherExe = join(tempDir, 'node')
      await writeFile(otherExe, '#!/bin/bash\necho "mock node"')
      await chmod(otherExe, 0o755)

      await expect(resolvePythonExecutable(otherExe)).rejects.toThrow(/doesn't appear to be a Python executable/)
    })
  })

  describe('bin directory resolution', () => {
    it('resolves python from bin directory passed directly', async () => {
      const result = await resolvePythonExecutable(binDir)
      expect(result).toBe(join(binDir, 'python'))
    })

    it('prefers python over python3 in bin directory', async () => {
      // Ensure python3 exists
      const python3Path = join(binDir, 'python3')
      await writeFile(python3Path, '#!/bin/bash\necho "mock python3"')
      await chmod(python3Path, 0o755)

      const result = await resolvePythonExecutable(binDir)
      expect(result).toBe(join(binDir, 'python'))
    })

    it('falls back to python3 when python does not exist in bin', async () => {
      const python3OnlyBin = join(tempDir, 'python3-only-bin')
      await mkdir(python3OnlyBin, { recursive: true })

      const python3Path = join(python3OnlyBin, 'python3')
      await writeFile(python3Path, '#!/bin/bash\necho "mock python3"')
      await chmod(python3Path, 0o755)

      const result = await resolvePythonExecutable(python3OnlyBin)
      expect(result).toBe(python3Path)
    })
  })

  describe('venv root directory resolution', () => {
    it('resolves python executable from venv root directory', async () => {
      const result = await resolvePythonExecutable(venvDir)
      expect(result).toBe(join(binDir, 'python'))
    })

    it('prefers python over python3 when both exist', async () => {
      // Ensure python3 exists
      const python3Path = join(binDir, 'python3')
      await writeFile(python3Path, '#!/bin/bash\necho "mock python3"')
      await chmod(python3Path, 0o755)

      const result = await resolvePythonExecutable(venvDir)
      expect(result).toBe(join(binDir, 'python'))
    })

    it('falls back to python3 when python does not exist', async () => {
      // Create a venv with only python3
      const python3OnlyVenv = join(tempDir, 'python3-only-venv')
      const python3OnlyBin = join(python3OnlyVenv, 'bin')
      await mkdir(python3OnlyBin, { recursive: true })

      const python3Path = join(python3OnlyBin, 'python3')
      await writeFile(python3Path, '#!/bin/bash\necho "mock python3"')
      await chmod(python3Path, 0o755)

      const result = await resolvePythonExecutable(python3OnlyVenv)
      expect(result).toBe(python3Path)
    })
  })

  describe('error cases', () => {
    it('throws error for non-existent path', async () => {
      const nonExistent = join(tempDir, 'does-not-exist')
      await expect(resolvePythonExecutable(nonExistent)).rejects.toThrow(`Python path not found: ${nonExistent}`)
    })

    it('throws error when no python in directory', async () => {
      const emptyDir = join(tempDir, 'empty-dir')
      await mkdir(emptyDir, { recursive: true })

      await expect(resolvePythonExecutable(emptyDir)).rejects.toThrow(/No Python executable found at/)
    })

    it('throws error when venv has no bin directory and no python', async () => {
      const noBinVenv = join(tempDir, 'no-bin-venv')
      await mkdir(noBinVenv, { recursive: true })

      await expect(resolvePythonExecutable(noBinVenv)).rejects.toThrow(/No Python executable found at/)
    })

    it('provides helpful error message with accepted formats', async () => {
      const emptyDir = join(tempDir, 'helpful-error-test')
      await mkdir(emptyDir, { recursive: true })

      await expect(resolvePythonExecutable(emptyDir)).rejects.toThrow(/You can pass:/)
    })
  })
})

describe('detectDefaultPython', () => {
  const mockExecSync = vi.mocked(execSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns "python" when python is available', () => {
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))

    const result = detectDefaultPython()

    expect(result).toBe('python')
    expect(mockExecSync).toHaveBeenCalledWith('python --version', { stdio: 'ignore' })
  })

  it('returns "python3" when python is not available but python3 is', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command === 'python --version') {
        throw new Error('command not found: python')
      }
      return Buffer.from('Python 3.11.0')
    })

    const result = detectDefaultPython()

    expect(result).toBe('python3')
    expect(mockExecSync).toHaveBeenCalledWith('python --version', { stdio: 'ignore' })
    expect(mockExecSync).toHaveBeenCalledWith('python3 --version', { stdio: 'ignore' })
  })

  it('throws error when neither python nor python3 is available', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found')
    })

    expect(() => detectDefaultPython()).toThrow('No Python executable found')
    expect(() => detectDefaultPython()).toThrow('--python <path>')
  })

  it('only checks python3 if python check fails', () => {
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))

    detectDefaultPython()

    // Should only call once for 'python' since it succeeds
    expect(mockExecSync).toHaveBeenCalledTimes(1)
    expect(mockExecSync).toHaveBeenCalledWith('python --version', { stdio: 'ignore' })
  })
})

describe('selectPythonSpec', () => {
  const mockExecSync = vi.mocked(execSync)
  let savedDeepnotePython: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    savedDeepnotePython = process.env.DEEPNOTE_PYTHON
    delete process.env.DEEPNOTE_PYTHON
  })

  afterEach(() => {
    if (savedDeepnotePython === undefined) {
      delete process.env.DEEPNOTE_PYTHON
    } else {
      process.env.DEEPNOTE_PYTHON = savedDeepnotePython
    }
  })

  it('returns the explicit arg when provided, even if DEEPNOTE_PYTHON is set', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpec({ explicit: '/explicit/venv/bin/python' })

    expect(result).toBe('/explicit/venv/bin/python')
    // Precedence short-circuits before env or the autodetect fallback is ever consulted.
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('returns the explicit arg when provided and DEEPNOTE_PYTHON is unset', () => {
    const result = selectPythonSpec({ explicit: '/explicit/venv/bin/python' })

    expect(result).toBe('/explicit/venv/bin/python')
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('returns process.env.DEEPNOTE_PYTHON when no explicit arg is given', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpec({})

    expect(result).toBe('/env/venv/bin/python')
    // Env tier wins before the autodetect fallback is consulted.
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('reads DEEPNOTE_PYTHON when called with no argument object', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpec()

    expect(result).toBe('/env/venv/bin/python')
  })

  it('treats an undefined explicit as absent and falls through to DEEPNOTE_PYTHON', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpec({ explicit: undefined })

    expect(result).toBe('/env/venv/bin/python')
  })

  it('falls back to detectDefaultPython() when neither explicit arg nor DEEPNOTE_PYTHON is set', () => {
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))

    const result = selectPythonSpec({})

    expect(result).toBe('python')
    expect(mockExecSync).toHaveBeenCalledWith('python --version', { stdio: 'ignore' })
  })

  it('falls back through detectDefaultPython() to python3 when python is unavailable', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command === 'python --version') {
        throw new Error('command not found: python')
      }
      return Buffer.from('Python 3.11.0')
    })

    const result = selectPythonSpec({})

    expect(result).toBe('python3')
  })

  it('treats an empty explicit arg as absent and falls through to DEEPNOTE_PYTHON', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpec({ explicit: '' })

    expect(result).toBe('/env/venv/bin/python')
    // An empty explicit must not short-circuit to ''; it falls through the chain.
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('treats a whitespace-only explicit arg as absent and falls through to DEEPNOTE_PYTHON', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpec({ explicit: '   ' })

    expect(result).toBe('/env/venv/bin/python')
  })

  it('treats a blank DEEPNOTE_PYTHON as absent and falls through to autodetect', () => {
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))
    process.env.DEEPNOTE_PYTHON = ''

    const result = selectPythonSpec({})

    // before fix: returns '' ; after fix: returns the autodetected spec
    expect(result).toBe('python')
    expect(mockExecSync).toHaveBeenCalledWith('python --version', { stdio: 'ignore' })
  })

  it('treats a whitespace-only DEEPNOTE_PYTHON as absent and falls through to autodetect', () => {
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))
    process.env.DEEPNOTE_PYTHON = '   '

    const result = selectPythonSpec({})

    expect(result).toBe('python')
  })

  it('falls through an empty explicit AND a blank DEEPNOTE_PYTHON to autodetect', () => {
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))
    process.env.DEEPNOTE_PYTHON = ''

    const result = selectPythonSpec({ explicit: '' })

    expect(result).toBe('python')
  })
})

describe('selectPythonSpecWithHint', () => {
  // The single source of truth for the ADR-001 bare-system-python warning shared by the
  // CLI (`--python`) and MCP (`pythonPath`) consumers. The hint fires ONLY when the
  // resolved spec is bare AND no *real* (non-blank) override was supplied — a blank value
  // is not an override and must NOT suppress it.
  const mockExecSync = vi.mocked(execSync)
  let savedDeepnotePython: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    savedDeepnotePython = process.env.DEEPNOTE_PYTHON
    delete process.env.DEEPNOTE_PYTHON
    // Default to a bare autodetect so the hint gate can fire unless a test overrides it.
    mockExecSync.mockImplementation(() => Buffer.from('Python 3.11.0'))
  })

  afterEach(() => {
    if (savedDeepnotePython === undefined) {
      delete process.env.DEEPNOTE_PYTHON
    } else {
      process.env.DEEPNOTE_PYTHON = savedDeepnotePython
    }
  })

  it('attaches the hint when resolution lands on bare system python with no override', () => {
    const result = selectPythonSpecWithHint({ argLabel: '--python' })

    expect(result.spec).toBe('python')
    expect(result.hint).toBeDefined()
    expect(result.hint).toContain('system interpreter')
    expect(result.hint).toContain('DEEPNOTE_PYTHON')
    expect(result.hint).toContain('deepnote-toolkit')
  })

  it('embeds the caller-surface argLabel in the hint', () => {
    const cli = selectPythonSpecWithHint({ argLabel: '--python' })
    const mcp = selectPythonSpecWithHint({ argLabel: 'pythonPath' })

    expect(cli.hint).toContain('--python')
    expect(mcp.hint).toContain('pythonPath')
    expect(mcp.hint).not.toContain('--python')
  })

  it('does NOT attach a hint when an explicit (real) override is provided', () => {
    const result = selectPythonSpecWithHint({ explicit: '/explicit/venv/bin/python', argLabel: '--python' })

    expect(result.spec).toBe('/explicit/venv/bin/python')
    expect(result.hint).toBeUndefined()
  })

  it('does NOT attach a hint when DEEPNOTE_PYTHON is a real override', () => {
    process.env.DEEPNOTE_PYTHON = '/env/venv/bin/python'

    const result = selectPythonSpecWithHint({ argLabel: 'pythonPath' })

    expect(result.spec).toBe('/env/venv/bin/python')
    expect(result.hint).toBeUndefined()
  })

  it('does NOT attach a hint when the resolved spec is a non-bare interpreter', () => {
    // A path override resolves to a non-bare spec, so the bare-python gate never opens.
    const result = selectPythonSpecWithHint({ explicit: '/path/to/venv', argLabel: '--python' })

    expect(result.spec).toBe('/path/to/venv')
    expect(result.hint).toBeUndefined()
  })

  it('FIRES the hint when explicit is blank (blank is not an override)', () => {
    // A blank explicit falls through to bare autodetect; the warning must still surface.
    const result = selectPythonSpecWithHint({ explicit: '', argLabel: '--python' })

    expect(result.spec).toBe('python')
    expect(result.hint).toBeDefined()
    expect(result.hint).toContain('system interpreter')
  })

  it('FIRES the hint when DEEPNOTE_PYTHON is blank (blank is not an override)', () => {
    process.env.DEEPNOTE_PYTHON = ''

    const result = selectPythonSpecWithHint({ argLabel: 'pythonPath' })

    expect(result.spec).toBe('python')
    expect(result.hint).toBeDefined()
    expect(result.hint).toContain('system interpreter')
  })

  it('FIRES the hint when both explicit and DEEPNOTE_PYTHON are blank', () => {
    process.env.DEEPNOTE_PYTHON = ''

    const result = selectPythonSpecWithHint({ explicit: '   ', argLabel: '--python' })

    expect(result.spec).toBe('python')
    expect(result.hint).toBeDefined()
  })

  it('does NOT attach a hint when DEEPNOTE_PYTHON is an explicit bare override', () => {
    // The user explicitly chose a bare interpreter via env — that is a real override,
    // so even though the spec is bare, no hint fires.
    process.env.DEEPNOTE_PYTHON = 'python'

    const result = selectPythonSpecWithHint({ argLabel: 'pythonPath' })

    expect(result.spec).toBe('python')
    expect(result.hint).toBeUndefined()
  })
})

describe('buildPythonEnv', () => {
  let tempDir: string
  let venvDir: string
  let binDir: string
  let pythonPath: string

  beforeAll(async () => {
    tempDir = join(tmpdir(), `python-env-build-test-${Date.now()}`)
    venvDir = join(tempDir, 'my-venv')
    binDir = join(venvDir, 'bin')
    await mkdir(binDir, { recursive: true })

    pythonPath = join(binDir, 'python')
    await writeFile(pythonPath, '#!/bin/bash\necho "mock python"')
    await chmod(pythonPath, 0o755)

    // Create pyvenv.cfg to mark as a venv
    await writeFile(join(venvDir, 'pyvenv.cfg'), 'home = /usr/bin\nversion = 3.11.0\n')
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns env as-is for bare "python" command', async () => {
    const baseEnv = { PATH: '/usr/bin', VIRTUAL_ENV: '/some/other/venv', HOME: '/home/user' }
    const env = await buildPythonEnv('python', baseEnv)

    expect(env.PATH).toBe('/usr/bin')
    expect(env.VIRTUAL_ENV).toBe('/some/other/venv')
  })

  it('returns env as-is for bare "python3" command', async () => {
    const baseEnv = { PATH: '/usr/bin', VIRTUAL_ENV: '/some/other/venv' }
    const env = await buildPythonEnv('python3', baseEnv)

    expect(env.PATH).toBe('/usr/bin')
    expect(env.VIRTUAL_ENV).toBe('/some/other/venv')
  })

  it('returns env as-is for versioned "python3.11" command', async () => {
    const baseEnv = { PATH: '/usr/bin', VIRTUAL_ENV: '/some/other/venv' }
    const env = await buildPythonEnv('python3.11', baseEnv)

    expect(env.PATH).toBe('/usr/bin')
    expect(env.VIRTUAL_ENV).toBe('/some/other/venv')
  })

  it('prepends python directory to PATH for absolute path', async () => {
    const baseEnv = { PATH: '/usr/bin:/usr/local/bin' }
    const env = await buildPythonEnv(pythonPath, baseEnv)

    const resolvedBinDir = resolve(binDir)
    expect(env.PATH).toBe(`${resolvedBinDir}${delimiter}/usr/bin:/usr/local/bin`)
  })

  it('sets VIRTUAL_ENV when python is inside a venv', async () => {
    const baseEnv = { PATH: '/usr/bin' }
    const env = await buildPythonEnv(pythonPath, baseEnv)

    expect(env.VIRTUAL_ENV).toBe(resolve(venvDir))
  })

  it('clears inherited VIRTUAL_ENV when python is NOT in a venv', async () => {
    // Create a standalone python (no pyvenv.cfg in parent)
    const standaloneDir = join(tempDir, 'standalone', 'bin')
    await mkdir(standaloneDir, { recursive: true })
    const standalonePython = join(standaloneDir, 'python')
    await writeFile(standalonePython, '#!/bin/bash\necho "standalone"')
    await chmod(standalonePython, 0o755)

    const baseEnv = { PATH: '/usr/bin', VIRTUAL_ENV: '/some/other/venv' }
    const env = await buildPythonEnv(standalonePython, baseEnv)

    expect(env.VIRTUAL_ENV).toBeUndefined()
  })

  it('replaces inherited VIRTUAL_ENV with correct venv root', async () => {
    const baseEnv = { PATH: '/other/venv/bin:/usr/bin', VIRTUAL_ENV: '/other/venv' }
    const env = await buildPythonEnv(pythonPath, baseEnv)

    expect(env.VIRTUAL_ENV).toBe(resolve(venvDir))
    expect(env.PATH).toMatch(new RegExp(`^${resolve(binDir).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  })

  it('handles empty PATH in base env', async () => {
    const baseEnv = { PATH: undefined as string | undefined }
    const env = await buildPythonEnv(pythonPath, baseEnv)

    const resolvedBinDir = resolve(binDir)
    expect(env.PATH).toBe(resolvedBinDir)
  })
})
