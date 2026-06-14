import type { ApiProject, RunId, WsServerEvent } from '@deepnote/runtime-server/types'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import type { ExecutionClient } from '../execution/ExecutionClient'
import { Shell } from './Shell'

// Shell-level Run / Run-all wiring (design Phase 3). The Shell owns the single `ExecutionClient` +
// `useExecution` per loaded project (KD-1) and hosts a **Run all** control; it plumbs a per-block
// `run` descriptor down to each runnable block. The capability gate (KD-6) disables every run
// affordance when `capabilities.kernelLanguage === null`.

function makeFakeClient(): {
  client: ExecutionClient
  emit(event: WsServerEvent): void
  runAllCalls: number
  runBlockCalls: Array<{ blockId: string; notebookName: string }>
} {
  const subscribers = new Set<(event: WsServerEvent) => void>()
  const runBlockCalls: Array<{ blockId: string; notebookName: string }> = []
  let runAllCalls = 0
  let nextRunId = 1
  const client: ExecutionClient = {
    connect: () => Promise.resolve(),
    runBlock: (blockId, notebookName) => {
      runBlockCalls.push({ blockId, notebookName })
      return Promise.resolve(nextRunId++ as RunId)
    },
    runAll: () => {
      runAllCalls += 1
      return Promise.resolve(nextRunId++ as RunId)
    },
    cancel: () => {},
    subscribe: onEvent => {
      subscribers.add(onEvent)
      return () => subscribers.delete(onEvent)
    },
    onReconnect: () => () => {},
    status: 'open',
    close: () => {},
  }
  return {
    client,
    emit: e => {
      for (const s of [...subscribers]) s(e)
    },
    get runAllCalls() {
      return runAllCalls
    },
    runBlockCalls,
  }
}

/** A project whose capabilities say a kernel IS available (the fixture's is null). */
function withKernel(project: ApiProject['project']): ApiProject['project'] {
  return project
}

beforeEach(() => {
  window.location.hash = ''
})
afterEach(() => {
  window.location.hash = ''
})

describe('Shell — Run all + capability gate', () => {
  it('hosts a Run-all control that dispatches runAll (kernel available)', async () => {
    const fake = makeFakeClient()
    render(<Shell project={withKernel(sampleProject.project)} client={fake.client} kernelLanguage='python' />)
    const runAll = screen.getByRole('button', { name: /run all/i })
    expect((runAll as HTMLButtonElement).disabled).toBe(false)
    await act(async () => {
      fireEvent.click(runAll)
      await Promise.resolve()
    })
    expect(fake.runAllCalls).toBe(1)
  })

  it('disables Run-all and per-block Run when there is no kernel (KD-6)', () => {
    const fake = makeFakeClient()
    render(<Shell project={sampleProject.project} client={fake.client} kernelLanguage={null} />)
    const runAll = screen.getByRole('button', { name: /run all/i })
    expect((runAll as HTMLButtonElement).disabled).toBe(true)
    // Every per-block Run control is disabled too.
    const runButtons = screen.getAllByRole('button', { name: /^run$/i })
    expect(runButtons.length).toBeGreaterThan(0)
    for (const b of runButtons) expect((b as HTMLButtonElement).disabled).toBe(true)
  })

  it('clicking a block Run fires runBlock bound to that block and the active notebook', async () => {
    const fake = makeFakeClient()
    render(<Shell project={sampleProject.project} client={fake.client} kernelLanguage='python' />)
    // The default notebook is Analysis; its first runnable (code) block is 'a4'.
    const firstRun = screen.getAllByRole('button', { name: /^run$/i })[0]
    await act(async () => {
      fireEvent.click(firstRun)
      await Promise.resolve()
    })
    expect(fake.runBlockCalls.length).toBe(1)
    expect(fake.runBlockCalls[0]).toEqual({ blockId: 'a4', notebookName: 'Analysis' })
  })
})
