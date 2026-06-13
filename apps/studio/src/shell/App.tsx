import { useEffect, useState } from 'react'
import { fetchProject } from '../api/fetchProject'
import { LOADING_STATE, loadProjectState, type ProjectLoader, type ProjectState } from '../state/projectStore'
import { Shell } from './Shell'

// The app's fetch container (design Phase 3). On mount it reaches out over HTTP via the
// injected loader (default `fetchProject` → `GET /api/project`), holds the result in the
// `loading | loaded | error` discriminated state, and renders the matching UI:
//
//   • loading → a spinner affordance (role="status") while the request is in flight;
//   • loaded  → the real project handed to `<Shell>` (the same view that rendered the
//               fixture in step 3 — no shell change, the project is just real now);
//   • error   → an error banner (role="alert") carrying the s1-surfaced actionable message
//               (e.g. "deepnote-toolkit not installed"). Rendering only — no run/retry here.
//
// `loader` and `baseUrl` are injectable so component tests drive all three states without a
// real socket; production passes neither, so the default same-origin `fetchProject` runs.
export interface AppProps {
  /** Override the project loader (tests inject a stub; production uses `fetchProject`). */
  loader?: ProjectLoader
  /** Origin for the default same-origin loader; ignored when `loader` is provided. */
  baseUrl?: string
}

export function App({ loader, baseUrl = '' }: AppProps) {
  const [state, setState] = useState<ProjectState>(LOADING_STATE)

  useEffect(() => {
    let cancelled = false
    const load = loader ?? (() => fetchProject(baseUrl))
    void loadProjectState(load).then(next => {
      // Ignore a late resolution after unmount / a dependency change supersedes this load.
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [loader, baseUrl])

  if (state.status === 'loading') {
    return (
      <output className='app app--loading' aria-label='Loading project' aria-live='polite'>
        <span className='app__spinner' aria-hidden='true' />
        <span className='app__loading-text'>Loading project…</span>
      </output>
    )
  }

  if (state.status === 'error') {
    return (
      <div className='app app--error'>
        <div className='app__error-banner' role='alert'>
          <h1 className='app__error-title'>Couldn’t open the project</h1>
          <p className='app__error-message'>{state.error.message}</p>
        </div>
      </div>
    )
  }

  return <Shell project={state.project} />
}
