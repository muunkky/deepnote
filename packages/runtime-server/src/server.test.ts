import { createConnection } from 'node:net'
import { describe, expect, it } from 'vitest'
import { createServer } from './server'

/** Resolve true if a TCP connection to `port` on localhost is accepted. */
function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
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
})
