import type { ApiProject } from '@deepnote/runtime-server/types'

// View-models are DERIVED from the imported `ApiProject` contract, never re-declared
// (ADR-007 §6 drift-catch). If the s1 server changes the project shape, these aliases —
// and every component typed against them — become a compile error rather than drifting
// silently. There is no second hand-written shape to drift *from*.
export type ProjectVM = ApiProject['project']
export type NotebookVM = ProjectVM['notebooks'][number]
export type BlockVM = NotebookVM['blocks'][number]

/**
 * Resolve the notebook to show given the project and an optionally hash-supplied id.
 *
 * Precedence (design Phase 2 routing rule): an explicit, *valid* id wins; otherwise the
 * project's `initNotebookId` (when it names a real notebook); otherwise the first notebook.
 * Returns `undefined` only for an empty project (no notebooks at all).
 */
export function resolveActiveNotebookId(project: ProjectVM, requestedId?: string): string | undefined {
  const notebooks = project.notebooks
  if (notebooks.length === 0) return undefined
  if (requestedId && notebooks.some(nb => nb.id === requestedId)) return requestedId
  if (project.initNotebookId && notebooks.some(nb => nb.id === project.initNotebookId)) {
    return project.initNotebookId
  }
  return notebooks[0].id
}
