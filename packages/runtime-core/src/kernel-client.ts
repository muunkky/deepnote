import type { IDisplayData, IExecuteResult, IOutput } from '@jupyterlab/nbformat'
import { KernelManager, ServerConnection, SessionManager } from '@jupyterlab/services'
import type { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel'
import type { ISessionConnection } from '@jupyterlab/services/lib/session/session'
import { KernelDiedError, KernelLaunchError, KernelNotRegisteredError, type KernelspecSummary } from './kernel-errors'
import { DEFAULT_KERNEL_NAME } from './kernel-name'

export interface ExecutionResult {
  success: boolean
  outputs: IOutput[]
  executionCount: number | null
}

/**
 * Options for {@link KernelClient}. All optional so the existing zero-arg
 * `new KernelClient()` call sites stay valid; only `kernelStartupTimeoutMs`
 * is consumed today (ADR-002 / KD-7).
 */
export interface KernelClientOptions {
  /** Idle-wait budget for kernel startup, in milliseconds. Default 30000. */
  kernelStartupTimeoutMs?: number
}

const DEFAULT_KERNEL_STARTUP_TIMEOUT_MS = 30000

/** Shape of a single entry in `GET /api/kernelspecs`'s `kernelspecs` map. */
interface KernelspecEntry {
  name?: string
  spec?: {
    display_name?: string
    language?: string
  }
}

/** Shape of the `GET /api/kernelspecs` response we depend on. */
interface KernelspecsResponse {
  default?: string
  kernelspecs?: Record<string, KernelspecEntry>
}

/** Summarise a `/api/kernelspecs` map into the typed-error payload (KD-8). */
function summarizeKernelspecs(kernelspecs: Record<string, KernelspecEntry>): KernelspecSummary[] {
  return Object.entries(kernelspecs).map(([name, entry]) => ({
    name: entry.name ?? name,
    displayName: entry.spec?.display_name ?? name,
    language: entry.spec?.language ?? '',
  }))
}

export interface ExecutionCallbacks {
  onOutput?: (output: IOutput) => void
  onStart?: () => void
  onDone?: (result: ExecutionResult) => void
}

// Jupyter kernel WebSocket protocol to exclude from negotiation.
// The v1 binary protocol uses DataView with getBigUint64 for message
// deserialization, which fails in Bun's runtime with "Out of bounds access".
// Excluding it forces the server to fall back to JSON-based messaging.
// See: https://jupyter-server.readthedocs.io/en/latest/developers/websocket-protocols.html
const JUPYTER_BINARY_PROTOCOL = 'v1.kernel.websocket.jupyter.org'

/**
 * Creates a WebSocket factory that excludes the Jupyter binary wire protocol,
 * forcing JSON-only communication. Passed to ServerConnection.makeSettings()
 * via the documented WebSocket option.
 */
export function createJsonWebSocketFactory(): typeof WebSocket {
  return class extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const filtered = Array.isArray(protocols)
        ? protocols.filter(p => p !== JUPYTER_BINARY_PROTOCOL)
        : protocols === JUPYTER_BINARY_PROTOCOL
          ? undefined
          : protocols
      super(url, filtered)
    }
  } as typeof WebSocket
}

/**
 * Client for communicating with a Jupyter kernel via the Jupyter protocol.
 */
export class KernelClient {
  private kernelManager: KernelManager | null = null
  private sessionManager: SessionManager | null = null
  private session: ISessionConnection | null = null
  private kernel: IKernelConnection | null = null
  private readonly kernelStartupTimeoutMs: number

  constructor(options: KernelClientOptions = {}) {
    this.kernelStartupTimeoutMs = options.kernelStartupTimeoutMs ?? DEFAULT_KERNEL_STARTUP_TIMEOUT_MS
  }

  /**
   * Connect to a Jupyter server and start a kernel session.
   *
   * For any explicitly-set non-`python3` kernel name, a pre-flight
   * `GET /api/kernelspecs` validates the name before any `POST /api/kernels`,
   * converting the server's opaque `500` into a typed
   * {@link KernelNotRegisteredError}. The literal `python3` default skips the
   * GET entirely (round-trip-free, byte-stable Python path).
   *
   * @param serverUrl - The Jupyter server base URL.
   * @param kernelName - The kernelspec name to launch. Defaults to `'python3'`.
   * @returns The resolved kernelspec language for a registered non-`python3`
   *   kernel, or `undefined` for the `python3` fast-path or a failed pre-flight
   *   GET (the engine stores it as a forward-looking signal — KD-3).
   */
  async connect(serverUrl: string, kernelName: string = DEFAULT_KERNEL_NAME): Promise<string | undefined> {
    try {
      const url = new URL(serverUrl)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = url.toString()

      const serverSettings = ServerConnection.makeSettings({
        baseUrl: serverUrl,
        wsUrl,
        WebSocket: createJsonWebSocketFactory(),
      })

      this.kernelManager = new KernelManager({ serverSettings })
      this.sessionManager = new SessionManager({ kernelManager: this.kernelManager, serverSettings })

      // Pre-flight kernelspec validation for explicit non-python3 kernels (R2/KD-2/KD-3).
      // python3 skips the GET so the common path stays round-trip-free.
      let language: string | undefined
      if (kernelName !== DEFAULT_KERNEL_NAME) {
        language = await this.preflightKernelspec(serverUrl, kernelName)
      }

      // Wait for session manager to be ready
      await this.sessionManager.ready

      // Start a new session with the selected kernel
      try {
        this.session = await this.sessionManager.startNew({
          name: 'deepnote-cli',
          path: 'deepnote-cli',
          type: 'notebook',
          kernel: { name: kernelName },
        })
      } catch (cause) {
        throw new KernelLaunchError(kernelName, cause)
      }

      this.kernel = this.session.kernel
      if (!this.kernel) {
        throw new Error('Failed to start kernel')
      }

      // Wait for kernel to be idle (ready to execute)
      await this.waitForKernelIdle(this.kernelStartupTimeoutMs)

      return language
    } catch (error) {
      await this.disconnect()
      throw error
    }
  }

  /**
   * Pre-flight `GET {serverUrl}/api/kernelspecs` for a non-`python3` kernel.
   *
   * - An absent name throws {@link KernelNotRegisteredError} (before any POST).
   * - A failed GET returns `undefined` and falls through to the existing
   *   `/api` readiness handling — never a false missing-kernel error (R2).
   * - A registered name returns the kernelspec's reported language (KD-3).
   */
  private async preflightKernelspec(serverUrl: string, kernelName: string): Promise<string | undefined> {
    let specs: KernelspecsResponse
    try {
      const base = serverUrl.replace(/\/$/, '')
      // Raw `fetch` is deliberate for Phase 1's token-less LOCAL deepnote-toolkit
      // server (matches the NOM-002 spike's direct REST probing). It does NOT
      // carry the auth token / base-URL / custom headers that
      // `ServerConnection.makeSettings` applies. If a future deployment (Phase 2+)
      // puts the toolkit server behind auth or a non-trivial base path, route
      // this pre-flight through `makeSettings` instead.
      const response = await fetch(`${base}/api/kernelspecs`)
      if (!response.ok) {
        return undefined // fall back to /api readiness, not a missing-kernel error
      }
      specs = (await response.json()) as KernelspecsResponse
    } catch {
      return undefined // GET failed entirely — fall through to existing readiness path
    }

    const kernelspecs = specs.kernelspecs ?? {}
    const spec = kernelspecs[kernelName]
    if (!spec) {
      throw new KernelNotRegisteredError(kernelName, summarizeKernelspecs(kernelspecs))
    }
    return spec.spec?.language
  }

  /**
   * Wait for the kernel to reach idle status.
   */
  private async waitForKernelIdle(timeoutMs = DEFAULT_KERNEL_STARTUP_TIMEOUT_MS): Promise<void> {
    if (!this.kernel) return

    const startTime = Date.now()

    while (this.kernel.status !== 'idle') {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Kernel failed to reach idle status within ${timeoutMs}ms. Current status: ${this.kernel.status}`
        )
      }

      if (this.kernel.status === 'dead') {
        throw new KernelDiedError()
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * Execute code on the kernel and collect outputs.
   */
  async execute(code: string, callbacks?: ExecutionCallbacks): Promise<ExecutionResult> {
    const kernel = this.kernel
    if (!kernel) {
      throw new Error('Kernel not connected. Call connect() first.')
    }

    return new Promise((resolve, reject) => {
      const outputs: IOutput[] = []
      let executionCount: number | null = null
      let settled = false

      const future = kernel.requestExecute({ code })
      if (!future) {
        reject(new Error('Failed to execute code on kernel'))
        return
      }

      // Detect mid-run kernel death so it surfaces as a typed KernelDiedError
      // (not a bare Error or a silent hang). The typed instance must reach the
      // CLI boundary to stay distinct from an in-block user error (card qajbsg).
      //
      // A hard crash (e.g. `os._exit(1)`) does NOT always leave the kernel in the
      // terminal `'dead'` status: the Jupyter server auto-restarts a crashed kernel,
      // so the status transitions `busy → autorestarting → restarting → starting →
      // idle` and `'dead'` is never observed. From the perspective of the in-flight
      // execution, though, a server-initiated (auto)restart IS a death — the running
      // request is abandoned ("Canceled future … before replies were done") and can
      // never complete. Treat `'restarting'`/`'autorestarting'` during an active
      // execute as a kernel death too (`Status` union, @jupyterlab/services), so both
      // the CLI and the server report `kernel-died` instead of mis-categorizing the
      // cancelled future as an in-block user error (card wd2nil — verified against the
      // real toolkit, which auto-restarts rather than going `'dead'`).
      const onStatusChanged = (_sender: unknown, status: string) => {
        if ((status === 'dead' || status === 'restarting' || status === 'autorestarting') && !settled) {
          settled = true
          kernel.statusChanged.disconnect(onStatusChanged)
          future.dispose()
          reject(new KernelDiedError())
        }
      }
      kernel.statusChanged.connect(onStatusChanged)

      const cleanup = () => {
        kernel.statusChanged.disconnect(onStatusChanged)
      }

      callbacks?.onStart?.()

      future.onIOPub = msg => {
        const msgType = msg.header.msg_type

        if (msgType === 'execute_input') {
          executionCount = (msg.content as { execution_count?: number }).execution_count ?? null
        } else if (['stream', 'execute_result', 'display_data', 'error'].includes(msgType)) {
          const output = this.messageToOutput(msg)
          outputs.push(output)
          callbacks?.onOutput?.(output)
        }
      }

      future.done
        .then(() => {
          if (settled) return
          settled = true
          const hasError = outputs.some(o => o.output_type === 'error')
          const result: ExecutionResult = {
            success: !hasError,
            outputs,
            executionCount,
          }
          callbacks?.onDone?.(result)
          resolve(result)
        })
        .catch(error => {
          if (settled) return
          settled = true
          // A rejected future while the kernel is dead OR (auto)restarting is a kernel
          // death, not a generic failure — surface the typed error. The status-signal
          // handler above usually wins this race, but a crashed kernel can also reject
          // the future directly ("Canceled future for execute_request message before
          // replies were done") before the status settles, so we guard the catch path
          // on the same death/restart predicate (card wd2nil).
          const status = kernel.status
          const kernelDied = status === 'dead' || status === 'restarting' || status === 'autorestarting'
          reject(kernelDied ? new KernelDiedError() : error)
        })
        .finally(() => {
          cleanup()
          future.dispose()
        })
    })
  }

  /**
   * Disconnect from the kernel and clean up resources.
   *
   * Disposing an already-dead kernel (the Scenario-4 / `os._exit(1)` path) makes
   * `@jupyterlab/services` synchronously fire `connectionStatusChanged → 'disconnected'`,
   * which rejects its internal reconnect `PromiseDelegate` with `Error('Kernel connection
   * disconnected')` (`default.js` `reconnect()`). That delegate is library-internal — we
   * never receive it — so the rejection lands unhandled and a strict consumer (vitest) flags
   * it as a potential false-positive. It is benign: we are tearing the kernel down on purpose.
   * Pre-attaching a sink to the kernel's `info` promise (which rejects on the same signal)
   * and guarding the dispose calls keeps the predictable teardown rejection from leaking,
   * without swallowing real errors. (card wd2nil — surfaced once Scenario 4 kills a real kernel.)
   */
  async disconnect(): Promise<void> {
    // Sink the kernel `info` promise's disconnect-rejection (shares the signal that leaks).
    this.kernel?.info?.catch(() => {})

    if (this.session) {
      try {
        await this.session.shutdown()
      } catch {
        // Ignore shutdown errors (a dead kernel cannot be shut down cleanly).
      }
      try {
        this.session.dispose()
      } catch {
        // Ignore dispose errors on an already-dead kernel.
      }
      this.session = null
    }

    if (this.sessionManager) {
      this.sessionManager.dispose()
      this.sessionManager = null
    }

    if (this.kernelManager) {
      this.kernelManager.dispose()
      this.kernelManager = null
    }

    this.kernel = null
  }

  /**
   * Convert a Jupyter message to an IOutput object.
   */
  private messageToOutput(msg: { header: { msg_type: string }; content: unknown }): IOutput {
    const msgType = msg.header.msg_type
    const content = msg.content as Record<string, unknown>

    switch (msgType) {
      case 'stream':
        return {
          output_type: 'stream',
          name: content.name as 'stdout' | 'stderr',
          text: content.text as string,
        }

      case 'execute_result':
        return {
          output_type: 'execute_result',
          data: content.data as IExecuteResult['data'],
          metadata: (content.metadata ?? {}) as IExecuteResult['metadata'],
          execution_count: content.execution_count as number,
        }

      case 'display_data':
        return {
          output_type: 'display_data',
          data: content.data as IDisplayData['data'],
          metadata: (content.metadata ?? {}) as IDisplayData['metadata'],
        }

      case 'error':
        return {
          output_type: 'error',
          ename: content.ename as string,
          evalue: content.evalue as string,
          traceback: content.traceback as string[],
        }

      default:
        return {
          output_type: 'error',
          ename: 'UnknownMsgType',
          evalue: `Received unknown message type: ${msgType}`,
          traceback: [],
        }
    }
  }
}
