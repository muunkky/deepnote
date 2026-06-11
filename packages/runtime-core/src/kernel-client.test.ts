import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to create mocks that are available during vi.mock hoisting
const {
  mockRequestExecute,
  mockStatusChangedConnect,
  mockStatusChangedDisconnect,
  emitStatusChange,
  mockKernel,
  mockSession,
  mockSessionManager,
  mockKernelManager,
  mockMakeSettings,
  MockKernelManager,
  MockSessionManager,
} = vi.hoisted(() => {
  const mockRequestExecute = vi.fn()
  // Minimal lumino-ISignal stand-in for kernel.statusChanged so the execute()
  // mid-run death subscription can be exercised under mocks.
  const statusSlots = new Set<(sender: unknown, status: string) => void>()
  const mockStatusChangedConnect = vi.fn((slot: (sender: unknown, status: string) => void) => {
    statusSlots.add(slot)
    return true
  })
  const mockStatusChangedDisconnect = vi.fn((slot: (sender: unknown, status: string) => void) => {
    statusSlots.delete(slot)
    return true
  })
  const emitStatusChange = (status: string) => {
    for (const slot of [...statusSlots]) {
      slot(mockKernel, status)
    }
  }
  const mockKernel = {
    status: 'idle' as string,
    requestExecute: mockRequestExecute,
    statusChanged: {
      connect: mockStatusChangedConnect,
      disconnect: mockStatusChangedDisconnect,
    },
  }
  const mockSession = {
    kernel: mockKernel as typeof mockKernel | null,
    shutdown: vi.fn(),
    dispose: vi.fn(),
  }
  const mockSessionManager = {
    ready: Promise.resolve(),
    startNew: vi.fn().mockResolvedValue(mockSession),
    dispose: vi.fn(),
  }
  const mockKernelManager = {
    dispose: vi.fn(),
  }
  const mockMakeSettings = vi.fn((config: { baseUrl: string; wsUrl: string; WebSocket?: unknown }) => ({
    baseUrl: config.baseUrl,
    wsUrl: config.wsUrl,
    WebSocket: config.WebSocket,
  }))

  // Create actual constructor functions for the class mocks
  const MockKernelManager = vi.fn(function (this: typeof mockKernelManager) {
    Object.assign(this, mockKernelManager)
  })
  const MockSessionManager = vi.fn(function (this: typeof mockSessionManager) {
    Object.assign(this, mockSessionManager)
  })

  return {
    mockRequestExecute,
    mockStatusChangedConnect,
    mockStatusChangedDisconnect,
    emitStatusChange,
    mockKernel,
    mockSession,
    mockSessionManager,
    mockKernelManager,
    mockMakeSettings,
    MockKernelManager,
    MockSessionManager,
  }
})

vi.mock('@jupyterlab/services', () => ({
  ServerConnection: {
    makeSettings: mockMakeSettings,
  },
  KernelManager: MockKernelManager,
  SessionManager: MockSessionManager,
}))

import { KernelClient } from './kernel-client'
import { KernelDiedError, KernelLaunchError, KernelNotRegisteredError } from './kernel-errors'

// Helper to create a mock execution future
function createMockFuture() {
  return {
    onIOPub: null as ((msg: unknown) => void) | null,
    done: Promise.resolve(),
    dispose: vi.fn(),
  }
}

// A deferred-resolution future for tests that need to control when done settles
// (e.g. mid-run kernel death while a request is pending).
function createPendingFuture() {
  let resolveDone!: () => void
  let rejectDone!: (reason?: unknown) => void
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })
  return {
    onIOPub: null as ((msg: unknown) => void) | null,
    done,
    dispose: vi.fn(),
    resolveDone,
    rejectDone,
  }
}

/** Build a mocked `GET /api/kernelspecs` response from a name → language map. */
function mockKernelspecsResponse(specs: Record<string, string>): Response {
  const kernelspecs: Record<string, unknown> = {}
  for (const [name, language] of Object.entries(specs)) {
    kernelspecs[name] = { name, spec: { display_name: name, language } }
  }
  return {
    ok: true,
    json: async () => ({ default: 'python3', kernelspecs }),
  } as unknown as Response
}

describe('KernelClient', () => {
  let client: KernelClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = new KernelClient()

    // Reset mock state
    mockKernel.status = 'idle'
    mockSession.kernel = mockKernel
    mockSessionManager.startNew.mockReset()
    mockSessionManager.startNew.mockResolvedValue(mockSession)
    mockRequestExecute.mockReset()
    mockSession.shutdown.mockReset()
    mockStatusChangedConnect.mockClear()
    mockStatusChangedDisconnect.mockClear()

    // By default, no kernel reaches pre-flight (tests connect with python3),
    // but stub global fetch so any accidental call is observable, not a crash.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockKernelspecsResponse({ python3: 'python' }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('connect', () => {
    it('creates session manager with correct server settings', async () => {
      await client.connect('http://localhost:8888')

      expect(mockMakeSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:8888',
          wsUrl: 'ws://localhost:8888/',
        })
      )
    })

    it('converts https to wss for websocket URL', async () => {
      await client.connect('https://example.com:8888')

      expect(mockMakeSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://example.com:8888',
          wsUrl: 'wss://example.com:8888/',
        })
      )
    })

    it('passes a WebSocket factory to server settings', async () => {
      await client.connect('http://localhost:8888')

      const callArg = mockMakeSettings.mock.calls[mockMakeSettings.mock.calls.length - 1][0]
      expect(callArg).toHaveProperty('WebSocket')
      expect(typeof callArg.WebSocket).toBe('function')
    })

    it('starts a new session with python3 kernel', async () => {
      await client.connect('http://localhost:8888')

      expect(mockSessionManager.startNew).toHaveBeenCalledWith({
        name: 'deepnote-cli',
        path: 'deepnote-cli',
        type: 'notebook',
        kernel: { name: 'python3' },
      })
    })

    it('waits for kernel to become idle', async () => {
      mockKernel.status = 'starting'

      const connectPromise = client.connect('http://localhost:8888')

      // Kernel is starting
      await vi.advanceTimersByTimeAsync(50)
      expect(mockKernel.status).toBe('starting')

      // Kernel becomes idle
      mockKernel.status = 'idle'
      await vi.advanceTimersByTimeAsync(100)

      await connectPromise
    })

    it('throws if kernel becomes dead', async () => {
      mockKernel.status = 'starting'

      const connectPromise = client.connect('http://localhost:8888')
      // Immediately attach error handler to avoid unhandled rejection
      const errorPromise = connectPromise.catch(e => e)

      // Kernel dies
      mockKernel.status = 'dead'
      await vi.advanceTimersByTimeAsync(100)

      const error = await errorPromise
      expect(error).toBeInstanceOf(KernelDiedError)
      expect(error.category).toBe('kernel-died')
      expect(error.message).toBe('Kernel is dead')
    })

    it('throws if kernel fails to become idle within timeout', async () => {
      mockKernel.status = 'starting'

      const connectPromise = client.connect('http://localhost:8888')
      // Immediately attach error handler to avoid unhandled rejection
      const errorPromise = connectPromise.catch(e => e)

      // Never becomes idle
      await vi.advanceTimersByTimeAsync(31000)

      const error = await errorPromise
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('Kernel failed to reach idle status within')
    })

    it('throws if session has no kernel', async () => {
      mockSession.kernel = null

      await expect(client.connect('http://localhost:8888')).rejects.toThrow('Failed to start kernel')
    })

    it('wraps a startNew rejection in a KernelLaunchError', async () => {
      mockSessionManager.startNew.mockRejectedValueOnce(new Error('Connection failed'))

      const error = await client.connect('http://localhost:8888').catch(e => e)
      expect(error).toBeInstanceOf(KernelLaunchError)
      expect(error.category).toBe('kernel-launch')
      expect(error.kernelName).toBe('python3')
      expect(error.cause).toBeInstanceOf(Error)
      expect((error.cause as Error).message).toBe('Connection failed')
    })

    describe('kernel name threading + pre-flight', () => {
      it('connect(url, python3) skips the kernelspecs GET and resolves undefined', async () => {
        const language = await client.connect('http://localhost:8888', 'python3')

        expect(globalThis.fetch).not.toHaveBeenCalled()
        expect(language).toBeUndefined()
        expect(mockSessionManager.startNew).toHaveBeenCalledWith(
          expect.objectContaining({ kernel: { name: 'python3' } })
        )
      })

      it('passes the explicit kernel name to startNew and resolves its language', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockKernelspecsResponse({ python3: 'python', bash: 'bash' }))

        const language = await client.connect('http://localhost:8888', 'bash')

        expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8888/api/kernelspecs')
        expect(mockSessionManager.startNew).toHaveBeenCalledWith(expect.objectContaining({ kernel: { name: 'bash' } }))
        expect(language).toBe('bash')
      })

      it('throws KernelNotRegisteredError BEFORE startNew for an unregistered name', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockKernelspecsResponse({ python3: 'python' }))

        const error = await client.connect('http://localhost:8888', 'bash').catch(e => e)

        expect(error).toBeInstanceOf(KernelNotRegisteredError)
        expect(error.category).toBe('missing-kernel')
        expect(error.requested).toBe('bash')
        expect(error.available.map((k: { name: string }) => k.name)).toContain('python3')
        expect(mockSessionManager.startNew).not.toHaveBeenCalled()
      })

      it('falls through (no missing-kernel error) when the kernelspecs GET rejects', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))

        const language = await client.connect('http://localhost:8888', 'bash')

        expect(language).toBeUndefined()
        expect(mockSessionManager.startNew).toHaveBeenCalledWith(expect.objectContaining({ kernel: { name: 'bash' } }))
      })

      it('falls through when the kernelspecs GET returns a non-ok response', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
          ok: false,
          json: async () => ({}),
        } as unknown as Response)

        const language = await client.connect('http://localhost:8888', 'bash')

        expect(language).toBeUndefined()
        expect(mockSessionManager.startNew).toHaveBeenCalled()
      })

      it('wraps a startNew rejection for a registered kernel in KernelLaunchError', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockKernelspecsResponse({ python3: 'python', bash: 'bash' }))
        mockSessionManager.startNew.mockRejectedValueOnce(new Error('boom'))

        const error = await client.connect('http://localhost:8888', 'bash').catch(e => e)

        expect(error).toBeInstanceOf(KernelLaunchError)
        expect(error.kernelName).toBe('bash')
      })

      it('forwards a non-default kernelStartupTimeoutMs into waitForKernelIdle', async () => {
        const slowClient = new KernelClient({ kernelStartupTimeoutMs: 5000 })
        mockKernel.status = 'starting'

        const connectPromise = slowClient.connect('http://localhost:8888')
        const errorPromise = connectPromise.catch(e => e)

        // Advance just past the configured 5s budget; the kernel never idles.
        await vi.advanceTimersByTimeAsync(5100)

        const error = await errorPromise
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toContain('within 5000ms')
      })
    })
  })

  describe('execute', () => {
    beforeEach(async () => {
      await client.connect('http://localhost:8888')
    })

    it('throws if not connected', async () => {
      const disconnectedClient = new KernelClient()

      await expect(disconnectedClient.execute('print("hello")')).rejects.toThrow(
        'Kernel not connected. Call connect() first.'
      )
    })

    it('executes code and returns success result', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('print("hello")')

      // Simulate IOPub messages
      future.onIOPub?.({
        header: { msg_type: 'execute_input' },
        content: { execution_count: 1 },
      })
      future.onIOPub?.({
        header: { msg_type: 'stream' },
        content: { name: 'stdout', text: 'hello\n' },
      })

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.executionCount).toBe(1)
      expect(result.outputs).toHaveLength(1)
      expect(result.outputs[0]).toEqual({
        output_type: 'stream',
        name: 'stdout',
        text: 'hello\n',
      })
    })

    it('returns failure result on error output', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('1/0')

      // Simulate error output
      future.onIOPub?.({
        header: { msg_type: 'error' },
        content: {
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: ['Traceback...', 'ZeroDivisionError: division by zero'],
        },
      })

      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.outputs).toHaveLength(1)
      expect(result.outputs[0]).toEqual({
        output_type: 'error',
        ename: 'ZeroDivisionError',
        evalue: 'division by zero',
        traceback: ['Traceback...', 'ZeroDivisionError: division by zero'],
      })
    })

    it('handles execute_result output', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('42')

      future.onIOPub?.({
        header: { msg_type: 'execute_result' },
        content: {
          data: { 'text/plain': '42' },
          metadata: {},
          execution_count: 1,
        },
      })

      const result = await resultPromise

      expect(result.outputs[0]).toEqual({
        output_type: 'execute_result',
        data: { 'text/plain': '42' },
        metadata: {},
        execution_count: 1,
      })
    })

    it('handles display_data output', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('display(HTML("<h1>Hello</h1>"))')

      future.onIOPub?.({
        header: { msg_type: 'display_data' },
        content: {
          data: { 'text/html': '<h1>Hello</h1>' },
          metadata: {},
        },
      })

      const result = await resultPromise

      expect(result.outputs[0]).toEqual({
        output_type: 'display_data',
        data: { 'text/html': '<h1>Hello</h1>' },
        metadata: {},
      })
    })

    it('calls onOutput callback for each output', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const onOutput = vi.fn()
      const resultPromise = client.execute('print("hello")', { onOutput })

      future.onIOPub?.({
        header: { msg_type: 'stream' },
        content: { name: 'stdout', text: 'hello\n' },
      })

      await resultPromise

      expect(onOutput).toHaveBeenCalledWith({
        output_type: 'stream',
        name: 'stdout',
        text: 'hello\n',
      })
    })

    it('calls onStart callback', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const onStart = vi.fn()
      await client.execute('print("hello")', { onStart })

      expect(onStart).toHaveBeenCalled()
    })

    it('calls onDone callback with result', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      const onDone = vi.fn()
      await client.execute('print("hello")', { onDone })

      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          outputs: [],
        })
      )
    })

    it('throws if requestExecute returns null', async () => {
      mockRequestExecute.mockReturnValue(null)

      await expect(client.execute('print("hello")')).rejects.toThrow('Failed to execute code on kernel')
    })

    it('disposes future after completion', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      await client.execute('print("hello")')

      expect(future.dispose).toHaveBeenCalled()
    })

    it('subscribes and unsubscribes from statusChanged across a normal execution', async () => {
      const future = createMockFuture()
      mockRequestExecute.mockReturnValue(future)

      await client.execute('print("hello")')

      expect(mockStatusChangedConnect).toHaveBeenCalled()
      expect(mockStatusChangedDisconnect).toHaveBeenCalled()
    })

    it('rejects with a typed KernelDiedError when the kernel dies mid-execution', async () => {
      const future = createPendingFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('while True: pass')
      const errorPromise = resultPromise.catch(e => e)

      // Kernel dies while the execute request is still pending.
      mockKernel.status = 'dead'
      emitStatusChange('dead')

      const error = await errorPromise
      expect(error).toBeInstanceOf(KernelDiedError)
      expect(error.category).toBe('kernel-died')
      // The mid-run subscription must be torn down so it does not leak.
      expect(mockStatusChangedDisconnect).toHaveBeenCalled()
      expect(future.dispose).toHaveBeenCalled()
    })

    it('surfaces a KernelDiedError when the future rejects and the kernel is dead', async () => {
      const future = createPendingFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('print(1)')
      const errorPromise = resultPromise.catch(e => e)

      mockKernel.status = 'dead'
      future.rejectDone(new Error('connection lost'))

      const error = await errorPromise
      expect(error).toBeInstanceOf(KernelDiedError)
    })

    it('surfaces the underlying error when the future rejects and the kernel is alive', async () => {
      const future = createPendingFuture()
      mockRequestExecute.mockReturnValue(future)

      const resultPromise = client.execute('print(1)')
      const errorPromise = resultPromise.catch(e => e)

      future.rejectDone(new Error('transient glitch'))

      const error = await errorPromise
      expect(error).not.toBeInstanceOf(KernelDiedError)
      expect(error.message).toBe('transient glitch')
    })
  })

  describe('disconnect', () => {
    it('shuts down session and disposes managers', async () => {
      await client.connect('http://localhost:8888')
      await client.disconnect()

      expect(mockSession.shutdown).toHaveBeenCalled()
      expect(mockSession.dispose).toHaveBeenCalled()
      expect(mockSessionManager.dispose).toHaveBeenCalled()
      expect(mockKernelManager.dispose).toHaveBeenCalled()
    })

    it('handles shutdown errors gracefully', async () => {
      mockSession.shutdown.mockRejectedValueOnce(new Error('Shutdown failed'))

      await client.connect('http://localhost:8888')
      // Should not throw
      await client.disconnect()

      expect(mockSession.dispose).toHaveBeenCalled()
    })

    it('does nothing if not connected', async () => {
      // Should not throw
      await client.disconnect()
    })
  })
})
