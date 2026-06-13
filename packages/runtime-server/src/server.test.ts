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

  it('listen(port, "127.0.0.1") binds the server to loopback, never 0.0.0.0', async () => {
    const server = createServer()

    // Bind explicitly to loopback (the `deepnote serve` path). The OS picks the port.
    const port = await server.listen(0, '127.0.0.1')
    expect(port).toBeGreaterThan(0)

    // Reachable on loopback…
    expect(await canConnect(port)).toBe(true)
    // …and the *server-side* bound interface is loopback, never the unspecified address.
    // This reads `http.address().address` (the authoritative bind interface), not a client
    // socket's `localAddress` — a loopback client connection always reports `127.0.0.1`
    // regardless of the server's bind, so only the server-side address distinguishes a
    // loopback-only bind from an all-interfaces (`0.0.0.0`) bind. This is the security
    // guarantee the serve command relies on; mutating the impl to bind `0.0.0.0` makes the
    // next assertion fail.
    expect(server.boundAddress()).toBe('127.0.0.1')
    expect(server.boundAddress()).not.toBe('0.0.0.0')

    await server.close()
    expect(await canConnect(port)).toBe(false)
    // After close the listener has no bound address.
    expect(server.boundAddress()).toBeNull()
  })

  it('listen(port) with no host binds the unspecified (all-interfaces) address', async () => {
    // The omitted-host lifecycle path: Node binds the unspecified address (all interfaces).
    // The negative leg of the loopback guarantee — if `serve`'s loopback bind ever silently
    // regressed to all-interfaces, the server-side address would read as the unspecified
    // address (this branch), and the loopback assertion above would fail.
    const server = createServer()

    const port = await server.listen(0)
    expect(port).toBeGreaterThan(0)

    const address = server.boundAddress()
    // IPv4 `0.0.0.0` or IPv6 `::`, depending on the host's default protocol — either is the
    // unspecified address, and crucially NOT the `127.0.0.1` the loopback bind reports.
    expect(['0.0.0.0', '::']).toContain(address)
    expect(address).not.toBe('127.0.0.1')

    await server.close()
  })
})
