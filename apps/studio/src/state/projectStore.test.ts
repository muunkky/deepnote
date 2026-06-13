import { describe, expect, it, vi } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import { ProjectLoadError } from '../api/fetchProject'
import { loadProjectState } from './projectStore'

// State-machine behaviour of the load store (design Phase 3 "State test").
//
// `loadProjectState` is the pure orchestration seam between `fetchProject` and the UI: it
// takes a loader thunk (so the test injects a stub instead of touching the network) and
// resolves to the terminal `loaded` / `error` state. The initial `{ status: 'loading' }`
// is what `App` renders synchronously before the promise settles; here we assert the
// terminal mapping in both directions.

describe('loadProjectState', () => {
  it('maps a successful fetch to a loaded state carrying project + capabilities + active id', async () => {
    const state = await loadProjectState(() => Promise.resolve(sampleProject))

    expect(state.status).toBe('loaded')
    if (state.status !== 'loaded') throw new Error('expected loaded')
    expect(state.project).toEqual(sampleProject.project)
    expect(state.capabilities).toEqual(sampleProject.capabilities)
    // The active notebook is resolved up front (initNotebookId precedence).
    expect(state.activeNotebookId).toBe(sampleProject.project.initNotebookId)
  })

  it('maps a ProjectLoadError to an error state carrying that typed error', async () => {
    const err = new ProjectLoadError('deepnote-toolkit not installed', 400)
    const state = await loadProjectState(() => Promise.reject(err))

    expect(state.status).toBe('error')
    if (state.status !== 'error') throw new Error('expected error')
    expect(state.error).toBe(err)
    expect(state.error.message).toBe('deepnote-toolkit not installed')
  })

  it('normalises a non-ProjectLoadError rejection into a ProjectLoadError', async () => {
    const state = await loadProjectState(() => Promise.reject(new Error('boom')))

    expect(state.status).toBe('error')
    if (state.status !== 'error') throw new Error('expected error')
    expect(state.error).toBeInstanceOf(ProjectLoadError)
    expect(state.error.message).toContain('boom')
  })

  it('falls back to the first notebook when the project has no initNotebookId', async () => {
    const noInit = {
      ...sampleProject,
      project: { ...sampleProject.project, initNotebookId: undefined },
    }
    const state = await loadProjectState(() => Promise.resolve(noInit))

    if (state.status !== 'loaded') throw new Error('expected loaded')
    expect(state.activeNotebookId).toBe(noInit.project.notebooks[0].id)
  })

  it('invokes the loader exactly once', async () => {
    const loader = vi.fn(() => Promise.resolve(sampleProject))
    await loadProjectState(loader)
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
