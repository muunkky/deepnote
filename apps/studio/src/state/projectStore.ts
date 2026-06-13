import type { ApiProject } from '@deepnote/runtime-server/types'
import { fetchProject, ProjectLoadError } from '../api/fetchProject'
import { resolveActiveNotebookId } from '../shell/viewModels'

// The project load state (design Phase 3 `ProjectState`).
//
// A three-arm discriminated union — `loading | loaded | error` — is the single source of
// truth `App` branches on to render the spinner, the shell, or the error banner. `loaded`
// carries the slices the shell consumes (`project` + `capabilities`, both DERIVED from the
// imported `ApiProject` contract, never re-declared) plus the resolved initial selection;
// `error` carries the typed {@link ProjectLoadError} whose message the banner renders.

/** The discriminated load state the UI renders against. */
export type ProjectState =
  | { status: 'loading' }
  | {
      status: 'loaded'
      project: ApiProject['project']
      capabilities: ApiProject['capabilities']
      activeNotebookId: string | undefined
    }
  | { status: 'error'; error: ProjectLoadError }

/** The synchronous initial state `App` renders before the load promise settles. */
export const LOADING_STATE: ProjectState = { status: 'loading' }

/** A loader thunk — `fetchProject` in production, a stub in tests. */
export type ProjectLoader = () => Promise<ApiProject>

/**
 * Run the loader and map its outcome onto the terminal {@link ProjectState}.
 *
 * Success → `loaded`, with the active notebook resolved up front (initNotebookId precedence,
 * shared with the shell so a deep-linked hash and the store agree). Any rejection → `error`
 * with a {@link ProjectLoadError}; a non-`ProjectLoadError` throw (defensive — `fetchProject`
 * already normalises) is wrapped so the error arm's `error` is always the typed class.
 *
 * @param loader Defaults to {@link fetchProject} (same-origin `GET /api/project`).
 */
export async function loadProjectState(loader: ProjectLoader = fetchProject): Promise<ProjectState> {
  try {
    const envelope = await loader()
    return {
      status: 'loaded',
      project: envelope.project,
      capabilities: envelope.capabilities,
      activeNotebookId: resolveActiveNotebookId(envelope.project),
    }
  } catch (err) {
    const error =
      err instanceof ProjectLoadError ? err : new ProjectLoadError(err instanceof Error ? err.message : String(err))
    return { status: 'error', error }
  }
}
