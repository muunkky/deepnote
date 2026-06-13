import { describe, expect, it } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import type { ProjectVM } from './viewModels'
import { resolveActiveNotebookId } from './viewModels'

const project = sampleProject.project

describe('resolveActiveNotebookId', () => {
  it('prefers a valid requested id', () => {
    expect(resolveActiveNotebookId(project, 'nb-scratch')).toBe('nb-scratch')
  })

  it('falls back to initNotebookId when the requested id is absent', () => {
    expect(resolveActiveNotebookId(project, 'does-not-exist')).toBe(project.initNotebookId)
    expect(resolveActiveNotebookId(project, undefined)).toBe(project.initNotebookId)
  })

  it('falls back to the first notebook when there is no usable initNotebookId', () => {
    const noInit: ProjectVM = { ...project, initNotebookId: undefined }
    expect(resolveActiveNotebookId(noInit, undefined)).toBe(project.notebooks[0].id)

    const staleInit: ProjectVM = { ...project, initNotebookId: 'ghost' }
    expect(resolveActiveNotebookId(staleInit, undefined)).toBe(project.notebooks[0].id)
  })

  it('returns undefined for a project with no notebooks', () => {
    const empty: ProjectVM = { ...project, notebooks: [] }
    expect(resolveActiveNotebookId(empty, 'anything')).toBeUndefined()
  })
})
