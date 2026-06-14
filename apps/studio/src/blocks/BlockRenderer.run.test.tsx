import type { RunId, WsServerEvent } from '@deepnote/runtime-server/types'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import type { ExecutionClient } from '../execution/ExecutionClient'
import { useExecution } from '../execution/useExecution'
import { BlockRenderer } from './BlockRenderer'
import { makeBlock } from './testBlocks'

// Capstone (card 3p2kbm Definition of Done): the ASSEMBLED run→render→replace loop, driven through
// `BlockRenderer` with a REAL `useExecution` (only the transport is faked). Clicking the Run control
// fires `runBlock` for that block; feeding the resulting `output` event renders the live `IOutput`
// IN PLACE through the existing `OutputRenderer`; a second Run REPLACES the prior live output rather
// than appending. This exercises the real reducer + hook + renderer together — no mocked seam.

/** A fake transport: records run triggers, and lets the test push WsServerEvents to subscribers. */
function makeFakeClient(): {
  client: ExecutionClient
  emit(event: WsServerEvent): void
  runBlockCalls: Array<{ blockId: string; notebookName: string }>
} {
  const subscribers = new Set<(event: WsServerEvent) => void>()
  const runBlockCalls: Array<{ blockId: string; notebookName: string }> = []
  let nextRunId = 1
  const client: ExecutionClient = {
    connect: () => Promise.resolve(),
    runBlock: (blockId, notebookName) => {
      runBlockCalls.push({ blockId, notebookName })
      return Promise.resolve(nextRunId++ as RunId)
    },
    runAll: () => Promise.resolve(nextRunId++ as RunId),
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
    emit: event => {
      for (const subscriber of [...subscribers]) subscriber(event)
    },
    runBlockCalls,
  }
}

// A tiny harness component that wires the real hook to a code block via BlockRenderer, mirroring how
// the Shell will plumb `run` down. The runId is captured per-click so the test can stream events for
// the exact run the click produced.
function Harness({ client, lastRunId }: { client: ExecutionClient; lastRunId: { current?: RunId } }) {
  const blockRef = useRef(makeBlock('cap1', 'code', 'print("hi")', { outputs: [] }))
  const { runBlock, blockState } = useExecution(client, { allBlockIds: ['cap1'] })
  const block = blockRef.current
  const state = blockState(block.id)
  return (
    <BlockRenderer
      block={block}
      run={{
        status: state.status,
        outputs: state.outputs,
        executionCount: state.executionCount,
        canRun: true,
        onRun: () => {
          void runBlock(block.id, 'Analysis').then(runId => {
            lastRunId.current = runId
          })
        },
      }}
    />
  )
}

describe('BlockRenderer capstone — assembled run→render→replace loop', () => {
  it('clicking Run fires runBlock; the streamed output renders in place; a re-run replaces it', async () => {
    const { client, emit, runBlockCalls } = makeFakeClient()
    const lastRunId: { current?: RunId } = {}
    render(<Harness client={client} lastRunId={lastRunId} />)

    // 1. Click Run → runBlock fires for THIS block.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run/i }))
      await Promise.resolve()
    })
    expect(runBlockCalls).toEqual([{ blockId: 'cap1', notebookName: 'Analysis' }])
    const firstRunId = lastRunId.current as RunId

    // 2. Stream the first run's output → it renders in place through OutputRenderer.
    act(() => {
      emit({ type: 'block-start', runId: firstRunId, blockId: 'cap1', total: 1 } as WsServerEvent)
      emit({
        type: 'output',
        runId: firstRunId,
        blockId: 'cap1',
        output: { output_type: 'stream', name: 'stdout', text: 'first-output\n' },
      } as WsServerEvent)
    })
    const block = document.querySelector('[data-block-id="cap1"]')
    expect(block?.querySelector('.output-renderer')?.textContent).toContain('first-output')

    // 3. Re-run → the second run's output REPLACES the first (block-start clears, KD-3).
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run/i }))
      await Promise.resolve()
    })
    const secondRunId = lastRunId.current as RunId
    expect(secondRunId).not.toBe(firstRunId)
    act(() => {
      emit({ type: 'block-start', runId: secondRunId, blockId: 'cap1', total: 1 } as WsServerEvent)
      emit({
        type: 'output',
        runId: secondRunId,
        blockId: 'cap1',
        output: { output_type: 'stream', name: 'stdout', text: 'second-output\n' },
      } as WsServerEvent)
    })
    const region = document.querySelector('[data-block-id="cap1"] .output-renderer')
    expect(region?.textContent).toContain('second-output')
    expect(region?.textContent).not.toContain('first-output')
  })
})
