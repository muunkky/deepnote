import type { IOutput } from '@jupyterlab/nbformat'

export interface RuntimeConfig {
  /** Path to Python virtual environment directory (e.g., /path/to/venv) */
  pythonEnv: string
  /** Working directory for execution */
  workingDirectory: string
  /** Optional port for the Jupyter server (auto-assigned if not provided) */
  serverPort?: number
  /** Optional environment variables to pass to the server */
  env?: Record<string, string>
  /**
   * Jupyter kernelspec name the server launches for execution. Sibling of
   * `pythonEnv` (ADR-002): `pythonEnv` selects which Python runs the toolkit
   * server; `kernelName` selects which kernel that server launches. Defaults to
   * `'python3'` — every existing notebook is byte-stable and skips the
   * pre-flight `GET /api/kernelspecs`.
   */
  kernelName?: string
  /**
   * Idle-wait budget for kernel startup, in milliseconds. Defaults to `30000`
   * (ADR-002 / KD-7), preserving today's behavior. Configurable so heavy
   * kernels (JVM/Julia warmup) are not failed on a spurious timeout.
   */
  kernelStartupTimeoutMs?: number
}

export interface BlockExecutionResult {
  blockId: string
  blockType: string
  success: boolean
  outputs: IOutput[]
  executionCount: number | null
  durationMs: number
  error?: Error
}

export interface ExecutionSummary {
  totalBlocks: number
  executedBlocks: number
  failedBlocks: number
  totalDurationMs: number
}
