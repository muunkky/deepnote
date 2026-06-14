import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BlockRun } from '../execution/blockRun'
import { createExecutionClient, type ExecutionClient } from '../execution/ExecutionClient'
// The loaded-project view. Owns the single piece of viewer state — which notebook is active
// — and keeps it in lockstep with `location.hash` so every view is linkable (design Phase 2).
//
// Selection ⇆ hash is bidirectional but single-sourced through `activeNotebookId`:
//   • mount / hashchange → derive the active id from the hash (resolveActiveNotebookId
//     applies the `valid-id → initNotebookId → first` precedence);
//   • a click → set state AND write the hash; the hashchange that the write triggers
//     resolves back to the same id, so there is no loop.
//
// Execution (design Phase 3): the Shell owns the SINGLE `ExecutionClient` + `useExecution` per
// loaded project (KD-1 — the backend has one queue/kernel). It hosts a **Run all** control and
// plumbs a per-block `run` descriptor down to each runnable block. Every run affordance is gated on
// `kernelLanguage` (KD-6): with no kernel the controls render but are disabled. The client is
// injectable so component tests drive the run loop with a fake transport; production constructs the
// same-origin `createExecutionClient()`.
import { useExecution } from '../execution/useExecution'
import { formatNotebookHash, parseNotebookHash } from './hashRoute'
import { NotebookList } from './NotebookList'
import { NotebookView } from './NotebookView'
import type { BlockVM, NotebookVM, ProjectVM } from './viewModels'
import { resolveActiveNotebookId } from './viewModels'

export interface ShellProps {
  project: ProjectVM
  /**
   * The resolved kernel language from `ApiProject.capabilities` (KD-6). `null` → no kernel: the run
   * affordances render disabled. Optional so the s2 shell/routing tests (which predate execution)
   * render without it — they get the no-kernel posture, which keeps every control inert as before.
   */
  kernelLanguage?: string | null
  /** Injectable execution transport (tests pass a fake; production omits → same-origin client). */
  client?: ExecutionClient
}

function readHashId(): string | undefined {
  return parseNotebookHash(window.location.hash)
}

/** The block kinds the run affordance applies to (mirrors BlockRenderer's RUNNABLE_TYPES). */
const RUNNABLE_TYPES = new Set<BlockVM['type']>(['code', 'sql'])

function runnableBlockIds(notebook: NotebookVM | undefined): string[] {
  if (notebook === undefined) return []
  return notebook.blocks.filter(b => RUNNABLE_TYPES.has(b.type)).map(b => b.id)
}

export function Shell({ project, kernelLanguage = null, client }: ShellProps) {
  const [activeNotebookId, setActiveNotebookId] = useState<string | undefined>(() =>
    resolveActiveNotebookId(project, readHashId())
  )

  // One client for the loaded project (KD-1). Construct the same-origin default lazily when the
  // caller injects none; held via useMemo so it is stable across renders and torn down on unmount.
  const executionClient = useMemo<ExecutionClient>(() => client ?? createExecutionClient(), [client])
  useEffect(() => {
    return () => {
      // Only tear down a client WE created — an injected client is owned by the caller (the test).
      if (client === undefined) executionClient.close()
    }
  }, [client, executionClient])

  const activeNotebook = project.notebooks.find(nb => nb.id === activeNotebookId)
  const allBlockIds = useMemo(() => runnableBlockIds(activeNotebook), [activeNotebook])
  const { runBlock, runAll, blockState } = useExecution(executionClient, { allBlockIds })

  const canRun = kernelLanguage !== null

  // Keep state in sync with browser-driven hash changes (back/forward, manual edit, a
  // pasted deep link landing after mount).
  useEffect(() => {
    const onHashChange = () => {
      setActiveNotebookId(resolveActiveNotebookId(project, readHashId()))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [project])

  const handleSelect = useCallback(
    (notebookId: string) => {
      setActiveNotebookId(resolveActiveNotebookId(project, notebookId))
      window.location.hash = formatNotebookHash(notebookId)
    },
    [project]
  )

  // Build the per-block run descriptor a runnable block consumes (KD-2 trigger bound at request
  // time inside `useExecution`). The active notebook's name is the route key for `runBlock`.
  const notebookName = activeNotebook?.name ?? ''
  const buildRun = useCallback(
    (block: BlockVM): BlockRun => {
      const state = blockState(block.id)
      return {
        status: state.status,
        outputs: state.outputs,
        executionCount: state.executionCount,
        canRun,
        onRun: () => {
          void runBlock(block.id, notebookName)
        },
      }
    },
    [blockState, canRun, runBlock, notebookName]
  )

  return (
    <div className='app'>
      <header className='app__header'>
        <h1 className='app__title'>{project.name}</h1>
        <button
          type='button'
          className='app__run-all'
          data-run-all='true'
          disabled={!canRun}
          onClick={() => {
            if (canRun) void runAll()
          }}
        >
          Run all
        </button>
      </header>
      <div className='app__body'>
        <NotebookList notebooks={project.notebooks} activeNotebookId={activeNotebookId} onSelect={handleSelect} />
        {activeNotebook ? (
          <NotebookView notebook={activeNotebook} buildRun={buildRun} />
        ) : (
          <main className='notebook-view notebook-view--empty' aria-label='No notebook'>
            <p>This project has no notebooks.</p>
          </main>
        )}
      </div>
    </div>
  )
}
