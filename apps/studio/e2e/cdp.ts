// Minimal Chrome DevTools Protocol client over Node's built-in WebSocket — just enough to
// drive a real headless Chromium for the timed HMR proof, with no Playwright/Puppeteer
// dependency (neither is installed and the worktree's shared node_modules is read-only).
// CDP is a JSON-over-WebSocket request/response + event protocol; this client covers the
// page-navigate + evaluate-expression surface the HMR test needs.

import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

export interface ChromeSession {
  /** Navigate the page to `url` and wait for the load event. */
  navigate(url: string): Promise<void>
  /** Evaluate a JS expression in the page and return its (JSON-serialisable) value. */
  evaluate<T>(expression: string): Promise<T>
  /** Close the page connection and kill the browser process. */
  close(): Promise<void>
}

interface CdpResult {
  id: number
  result?: { result?: { value?: unknown }; exceptionDetails?: unknown }
  error?: { message: string }
}

/** Locate the headless Chromium that Playwright's browser-install step cached. */
export function findChromeBinary(): string {
  const explicit = process.env.HMR_CHROME_BIN
  if (explicit) return explicit
  // Playwright caches under ~/.cache/ms-playwright/chromium-<rev>/chrome-linux64/chrome.
  const home = process.env.HOME ?? ''
  return join(home, '.cache', 'ms-playwright', 'chromium-1223', 'chrome-linux64', 'chrome')
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CDP HTTP ${res.status} for ${url}`)
  return (await res.json()) as T
}

export async function launchChrome(chromeBin: string): Promise<ChromeSession> {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hmr-chrome-'))
  // Let Chromium pick a free port (--remote-debugging-port=0) and report it via the
  // DevToolsActivePort file it writes into the user-data-dir — the collision-free idiom
  // (a fixed/random port races other test runs on a shared box).
  const stderrChunks: string[] = []
  let exitInfo = ''
  const proc: ChildProcess = spawn(
    chromeBin,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-component-update',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  proc.stderr?.on('data', chunk => {
    if (stderrChunks.length < 50) stderrChunks.push(String(chunk))
  })
  proc.on('exit', (code, signal) => {
    exitInfo = `chrome exited early (code=${code} signal=${signal})`
  })

  const readDevToolsPort = (): number | undefined => {
    try {
      const firstLine = readFileSync(join(userDataDir, 'DevToolsActivePort'), 'utf8').split('\n')[0]
      const port = Number(firstLine)
      return Number.isInteger(port) && port > 0 ? port : undefined
    } catch {
      return undefined
    }
  }

  // Wait for the DevTools HTTP endpoint, then open a page target.
  let wsUrl = ''
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    if (exitInfo) {
      rmSync(userDataDir, { recursive: true, force: true })
      throw new Error(`${exitInfo}\nstderr:\n${stderrChunks.join('').slice(-2000)}`)
    }
    const port = readDevToolsPort()
    if (port) {
      try {
        const targets = await fetchJson<Array<{ type: string; webSocketDebuggerUrl: string }>>(
          `http://127.0.0.1:${port}/json`
        )
        const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
        if (page) {
          wsUrl = page.webSocketDebuggerUrl
          break
        }
      } catch {
        // endpoint not up yet
      }
    }
    await delay(150)
  }
  if (!wsUrl) {
    proc.kill('SIGKILL')
    rmSync(userDataDir, { recursive: true, force: true })
    throw new Error(
      `Chromium DevTools endpoint did not come up. ${exitInfo}\nstderr:\n${stderrChunks.join('').slice(-2000)}`
    )
  }

  const ws = new WebSocket(wsUrl)
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true })
    ws.addEventListener('error', () => reject(new Error('CDP websocket error')), { once: true })
  })

  let nextId = 1
  const pending = new Map<number, (msg: CdpResult) => void>()
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(String(ev.data)) as CdpResult
    if (typeof msg.id === 'number' && pending.has(msg.id)) {
      const resolve = pending.get(msg.id)
      pending.delete(msg.id)
      resolve?.(msg)
    }
  })

  const send = (method: string, params: Record<string, unknown> = {}): Promise<CdpResult> => {
    const id = nextId++
    return new Promise((resolve, reject) => {
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          reject(new Error(`CDP method ${method} timed out`))
        }
      }, 20_000)
    })
  }

  await send('Page.enable')
  await send('Runtime.enable')

  return {
    async navigate(url: string) {
      await send('Page.navigate', { url })
      // Poll readyState rather than racing the load event for simplicity.
      const navDeadline = Date.now() + 20_000
      while (Date.now() < navDeadline) {
        const r = await send('Runtime.evaluate', {
          expression: 'document.readyState',
          returnByValue: true,
        })
        if (r.result?.result?.value === 'complete') return
        await delay(50)
      }
      throw new Error(`page did not finish loading ${url}`)
    },
    async evaluate<T>(expression: string): Promise<T> {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (r.error) throw new Error(`evaluate failed: ${r.error.message}`)
      if (r.result?.exceptionDetails) {
        throw new Error(`evaluate threw: ${JSON.stringify(r.result.exceptionDetails)}`)
      }
      return r.result?.result?.value as T
    },
    async close() {
      try {
        ws.close()
      } catch {
        // ignore
      }
      proc.kill('SIGKILL')
      // Chromium can still hold file locks for a beat after SIGKILL; retry the temp-dir
      // cleanup a few times so an ENOTEMPTY race doesn't fail an otherwise-green test.
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          rmSync(userDataDir, { recursive: true, force: true })
          break
        } catch {
          await delay(100)
        }
      }
    },
  }
}
