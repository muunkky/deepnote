import { execSync } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { basename, delimiter, dirname, join, resolve } from 'node:path'

const IS_WINDOWS = process.platform === 'win32'
const PYTHON_EXECUTABLES = IS_WINDOWS ? ['python.exe', 'python3.exe'] : ['python', 'python3']
const VENV_BIN_DIR = IS_WINDOWS ? 'Scripts' : 'bin'
const BARE_PYTHON_COMMAND = /^python[0-9.]*$/

/**
 * Resolves the Python executable path using smart detection.
 *
 * Accepts multiple input formats (similar to uv):
 * - 'python' or 'python3' → uses system Python
 * - '/path/to/python' (executable file) → uses it directly
 * - '/path/to/venv/bin' (directory with python) → uses python from that directory
 * - '/path/to/venv' (venv root with bin/python) → uses bin/python
 *
 * @param pythonPath - Path to Python executable, bin directory, or venv root
 * @returns The resolved path to the Python executable
 * @throws Error if the path doesn't exist or no Python executable is found
 */
export async function resolvePythonExecutable(pythonPath: string): Promise<string> {
  if (isBareSystemPython(pythonPath)) {
    return pythonPath
  }

  let fileStat: Awaited<ReturnType<typeof stat>>
  try {
    fileStat = await stat(pythonPath)
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') {
      throw new Error(`Python path not found: ${pythonPath}`)
    }
    throw new Error(`Failed to access Python path: ${pythonPath} (${error.code}: ${error.message})`)
  }

  // Case 1: Direct path to Python executable
  if (fileStat.isFile()) {
    const name = basename(pythonPath).toLowerCase()
    if (name.startsWith('python')) {
      return pythonPath
    }
    throw new Error(
      `Path is a file but doesn't appear to be a Python executable: ${pythonPath}\n` +
        'Expected a file named python, python3, python.exe, or similar.'
    )
  }

  if (!fileStat.isDirectory()) {
    throw new Error(`Python path is neither a file nor a directory: ${pythonPath}`)
  }

  // Case 2: Directory containing python directly (bin/ or Scripts/ folder)
  const directPython = await findPythonInDirectory(pythonPath, PYTHON_EXECUTABLES)
  if (directPython) {
    return directPython
  }

  // Case 3: Venv root directory (look in bin/ or Scripts/)
  const binDir = join(pythonPath, VENV_BIN_DIR)
  const binDirStat = await stat(binDir).catch(() => null)

  if (binDirStat?.isDirectory()) {
    const venvPython = await findPythonInDirectory(binDir, PYTHON_EXECUTABLES)
    if (venvPython) {
      return venvPython
    }
  }

  // No Python found - provide helpful error message
  const searchedPaths = [
    ...PYTHON_EXECUTABLES.map(c => join(pythonPath, c)),
    ...PYTHON_EXECUTABLES.map(c => join(binDir, c)),
  ]

  throw new Error(
    `No Python executable found at: ${pythonPath}\n\n` +
      `Searched for:\n${searchedPaths.map(p => `  - ${p}`).join('\n')}\n\n` +
      'You can pass:\n' +
      '  - A Python executable: --python /path/to/venv/bin/python\n' +
      '  - A bin directory: --python /path/to/venv/bin\n' +
      '  - A venv root: --python /path/to/venv'
  )
}

/**
 * Finds a Python executable in the given directory.
 */
async function findPythonInDirectory(dir: string, candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    const pythonPath = join(dir, candidate)
    const pythonStat = await stat(pythonPath).catch(() => null)
    if (pythonStat?.isFile()) {
      return pythonPath
    }
  }
  return null
}

/**
 * Detects the default Python command available on the system.
 * Tries 'python' first, then falls back to 'python3'.
 *
 * @returns 'python' or 'python3' depending on what's available
 * @throws Error if neither python nor python3 is found
 */
export function detectDefaultPython(): string {
  if (isPythonAvailable('python')) {
    return 'python'
  }

  if (isPythonAvailable('python3')) {
    return 'python3'
  }

  throw new Error(
    'No Python executable found.\n\n' +
      'Please ensure Python is installed and available in your PATH,\n' +
      'or specify the path explicitly with --python <path>'
  )
}

/**
 * Selects the Python interpreter *spec* to use, applying the shared precedence
 * chain from ADR-001:
 *
 *   1. `explicit` — a per-invocation caller argument (CLI `--python`, MCP
 *      `deepnote_run` `pythonPath`). Most specific signal, so it wins.
 *   2. `process.env.DEEPNOTE_PYTHON` — the public interop contract by which an
 *      editor/host publishes the user-selected interpreter when it spawns the
 *      server or CLI.
 *   3. {@link detectDefaultPython} — the autodetect fallback (matches today's CLI).
 *
 * An empty or whitespace-only signal at any tier is treated as **absent**, not as a
 * present value: it falls through to the next tier exactly as `undefined` would. (A
 * plain `??` chain would instead pass `""` straight through to the engine, which then
 * fails on an empty interpreter path — the regression this guards against.) So a blank
 * `explicit` arg or a blank `DEEPNOTE_PYTHON=` resolves to autodetect, never to `""`.
 *
 * Both the CLI and the MCP server call this so they can never disagree on which
 * interpreter to run against.
 *
 * The returned value is a spec **string** (executable path, `bin/` directory, or
 * venv root) — it is NOT a built spawn environment. Turning the spec into a
 * concrete executable plus `PATH`/`VIRTUAL_ENV` happens inside the
 * `ExecutionEngine` (`server-starter.ts` calls `resolvePythonExecutable` then
 * `buildPythonEnv`), so callers get an identically-built environment for free
 * simply by passing this spec as `RuntimeConfig.pythonEnv`.
 *
 * Keep this a pure precedence selector with no assembly; it is trivially
 * unit-testable.
 *
 * @param options.explicit - The explicit caller-supplied spec, if any.
 * @returns The selected Python interpreter spec string.
 * @throws Error from {@link detectDefaultPython} if no spec is supplied, no
 *   `DEEPNOTE_PYTHON` is set, and neither `python` nor `python3` is found.
 */
export function selectPythonSpec({ explicit }: { explicit?: string } = {}): string {
  return firstNonBlank(explicit) ?? firstNonBlank(process.env.DEEPNOTE_PYTHON) ?? detectDefaultPython()
}

/**
 * Normalises an interpreter signal: returns the value unchanged when it carries a
 * real spec, or `undefined` when it is absent, empty, or whitespace-only — so an
 * empty/blank signal falls through the precedence chain instead of being treated
 * as a present value.
 */
function firstNonBlank(value: string | undefined): string | undefined {
  if (value == null || value.trim().length === 0) {
    return undefined
  }
  return value
}

/**
 * Selects the Python interpreter spec via {@link selectPythonSpec} and attaches an
 * actionable `hint` when resolution lands on a bare system interpreter with no real
 * override — the single source of truth for the ADR-001 bare-python warning shared by
 * every `deepnote-run` consumer (CLI `deepnote run`, MCP `deepnote_run`).
 *
 * Previously this decision was copy-pasted into both consumers, so a change to the
 * override semantics (e.g. the empty-string remediation that tightened `hasOverride`
 * to a non-blank check) had to be applied in lockstep to both copies. Centralising it
 * here means CLI and MCP can never diverge on hint behaviour.
 *
 * The hint fires ONLY when BOTH hold:
 *   1. the resolved spec is a bare system interpreter ({@link isBareSystemPython}), and
 *   2. the caller gave no *real* override — neither a non-blank `explicit` argument nor
 *      a non-blank `DEEPNOTE_PYTHON` env var.
 *
 * A blank/whitespace-only value is **not** an override: it falls through to autodetect
 * in {@link selectPythonSpec} exactly as an absent one would, so it must NOT suppress the
 * hint — otherwise an empty signal would both resolve to a bare interpreter AND silence
 * the warning that it likely lacks the toolkit.
 *
 * A bare system interpreter typically lacks `deepnote-toolkit`, so without this hint the
 * failure surfaces as an opaque import error deep inside execution rather than up front at
 * the consumer boundary. The consumer is responsible for *surfacing* the hint (the CLI
 * prints it on a human status line, gated behind `!isMachineOutput`; the MCP tool returns
 * it as `pythonHint`); this helper only *computes* it.
 *
 * @param options.explicit - The explicit caller-supplied spec, if any (CLI `--python`,
 *   MCP `pythonPath`).
 * @param options.argLabel - The caller-surface noun embedded in the hint so each consumer
 *   names its own argument (`'--python'` for the CLI, `'pythonPath'` for the MCP tool).
 * @returns `{ spec }`, plus `hint` when the bare-system-python-without-override gate fires.
 */
export function selectPythonSpecWithHint({
  explicit,
  argLabel,
}: {
  explicit?: string
  argLabel: string
}): { spec: string; hint?: string } {
  const spec = selectPythonSpec({ explicit })
  const hasOverride = firstNonBlank(explicit) != null || firstNonBlank(process.env.DEEPNOTE_PYTHON) != null
  if (isBareSystemPython(spec) && !hasOverride) {
    return {
      spec,
      hint:
        `Resolved Python to "${spec}" (system interpreter) which likely lacks deepnote-toolkit. ` +
        `Set DEEPNOTE_PYTHON or pass ${argLabel} pointing at a venv with deepnote-toolkit[server] installed.`,
    }
  }
  return { spec }
}

/**
 * Checks if the given string is a bare system Python command (e.g. 'python', 'python3', 'python3.11')
 * as opposed to an absolute/relative path to a Python executable.
 */
export function isBareSystemPython(pythonPath: string): boolean {
  return BARE_PYTHON_COMMAND.test(pythonPath)
}

/**
 * Checks if a Python command is available on the system.
 */
function isPythonAvailable(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Detects the virtual environment root for a given Python executable path.
 *
 * Checks for `pyvenv.cfg` which is the standard marker for Python venvs.
 * Handles both `/path/to/venv/bin/python` and `/path/to/venv/Scripts/python.exe`.
 *
 * @returns The venv root directory, or null if the Python is not in a venv
 */
async function detectVenvRoot(pythonExecutable: string): Promise<string | null> {
  const binDir = dirname(pythonExecutable)
  const possibleVenvRoot = dirname(binDir)

  const pyvenvCfg = join(possibleVenvRoot, 'pyvenv.cfg')
  const cfgStat = await stat(pyvenvCfg).catch(() => null)
  if (cfgStat?.isFile()) {
    return possibleVenvRoot
  }

  return null
}

/**
 * Builds environment variables appropriate for the resolved Python executable.
 *
 * When a specific Python path is provided (not just 'python' or 'python3'),
 * this ensures the spawned process environment is consistent with the specified
 * Python by:
 * - Prepending the Python's directory to PATH so subprocesses find the right Python
 * - Setting VIRTUAL_ENV if the Python is in a venv
 * - Clearing VIRTUAL_ENV if the Python is NOT in a venv (to avoid inheriting
 *   the current shell's active venv)
 *
 * @param resolvedPythonPath - The resolved path from resolvePythonExecutable()
 * @param baseEnv - The base environment to modify (defaults to process.env)
 * @returns Environment variables object for use with child_process.spawn()
 */
export async function buildPythonEnv(
  resolvedPythonPath: string,
  baseEnv: Record<string, string | undefined> = process.env
): Promise<Record<string, string | undefined>> {
  const env = { ...baseEnv }

  if (isBareSystemPython(resolvedPythonPath)) {
    return env
  }

  const pythonDir = dirname(resolve(resolvedPythonPath))

  // Prepend the Python's directory to PATH so subprocesses (e.g. Jupyter kernels)
  // find the correct Python when using bare 'python' commands
  const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH'
  const currentPath = env[pathKey] || ''
  env[pathKey] = currentPath ? `${pythonDir}${delimiter}${currentPath}` : pythonDir

  // Detect if this Python is inside a virtual environment
  const venvRoot = await detectVenvRoot(resolve(resolvedPythonPath))
  if (venvRoot) {
    env.VIRTUAL_ENV = venvRoot
  } else {
    // Clear any inherited VIRTUAL_ENV to prevent the current shell's venv
    // from interfering with the specified Python
    delete env.VIRTUAL_ENV
  }

  return env
}
