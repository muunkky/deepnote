import { createConnection } from 'node:net'
import { describe, expect, it } from 'vitest'
import { createServer } from './server'

/** Resolve true if a TCP connection to `port` on localhost is accepted. */
function canConnect(port: number): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      socket.destroy()
      // `resolve` returns void; the explicit `void` keeps biome's type-unaware
      // per-file lint pass (pre-commit) from misreading it as a floating promise.
      void resolve(true)
    })
    socket.once('error', () => void resolve(false))
  })
}

describe('createServer (scaffold stub)', () => {
  it('listen(0) binds an OS-assigned port and close() releases it', async () => {
    const server = createServer()

    const port = await server.listen(0)
    expect(port).toBeGreaterThan(0)
    expect(await canConnect(port)).toBe(true)

    await server.close()
    expect(await canConnect(port)).toBe(false)
  })

  it('accepts the (future-wired) option surface without throwing', () => {
    // The scaffold accepts the step-3 options so the factory surface is stable;
    // they are not yet wired to behaviour.
    expect(() => createServer({ runQueueDepth: 8, wsHighWaterMark: 8 * 1024 * 1024 })).not.toThrow()
  })

  it('listen(port, host) constrains the bind to that interface', async () => {
    const server = createServer()

    // Bind explicitly to loopback (the `deepnote serve` path). The OS picks the port.
    const port = await server.listen(0, '127.0.0.1')
    expect(port).toBeGreaterThan(0)

    // Reachable on loopback…
    expect(await canConnect(port)).toBe(true)
    const address = await boundAddress(port)
    // …and bound to loopback, not the unspecified address — the security guarantee
    // the serve command relies on (never 0.0.0.0).
    expect(address).toBe('127.0.0.1')

    await server.close()
    expect(await canConnect(port)).toBe(false)
  })
})

/** Resolve the local address a connection to `port` lands on, or null if unreachable. */
function boundAddress(port: number): Promise<string | null> {
  return new Promise<string | null>(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      const addr = socket.localAddress ?? null
      socket.destroy()
      void resolve(addr)
    })
    socket.once('error', () => void resolve(null))
  })
}
