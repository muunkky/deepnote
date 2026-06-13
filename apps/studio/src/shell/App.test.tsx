import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import { App } from './App'

// Shell + routing component tests, driven entirely off the shared `: ApiProject` fixture.
// These encode the card's acceptance criteria: the list renders every notebook; clicking
// one routes (active selection updates) AND updates `location.hash`; the active notebook's
// blocks render in persisted array order; and `#/notebook/<id>` / no-hash default routing.
//
// Only `@testing-library/react` + vitest matchers are used (no jest-dom / user-event):
// assertions read attributes off the real DOM (`getAttribute` + `toBe`) so the suite needs
// no test dependency beyond what step 2 already installed.
const project = sampleProject.project

beforeEach(() => {
  // Each test starts from a clean hash so default-routing assertions are deterministic.
  window.location.hash = ''
})

afterEach(() => {
  window.location.hash = ''
})

describe('App shell — notebook list', () => {
  it('renders one list entry per notebook in the fixture', () => {
    render(<App project={project} />)
    const list = screen.getByRole('navigation', { name: 'Notebooks' })
    const entries = within(list).getAllByRole('button')
    expect(entries).toHaveLength(project.notebooks.length)
    expect(entries.map(el => el.textContent)).toEqual(project.notebooks.map(nb => nb.name))
  })

  it('selecting a notebook routes to it (active selection updates) and updates location.hash', () => {
    render(<App project={project} />)

    const target = project.notebooks[1] // not the default → a real change
    fireEvent.click(screen.getByRole('button', { name: target.name }))

    // Active selection updated: the clicked entry is now aria-current, and the main pane
    // shows that notebook.
    expect(screen.getByRole('button', { name: target.name }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('main', { name: `Notebook: ${target.name}` })).toBeDefined()

    // …and the hash updated so the view is linkable.
    expect(window.location.hash).toBe(`#/notebook/${target.id}`)
  })
})

describe('App shell — block order', () => {
  it('renders the active notebook blocks top-to-bottom in persisted blocks[] order', () => {
    render(<App project={project} />)
    const main = screen.getByRole('main', { name: `Notebook: ${project.notebooks[0].name}` })
    const renderedIds = Array.from(main.querySelectorAll('.block')).map(el => el.getAttribute('data-block-id'))
    expect(renderedIds).toEqual(project.notebooks[0].blocks.map(b => b.id))
  })
})

describe('App shell — routing', () => {
  it('loading #/notebook/<id> selects that notebook', () => {
    const target = project.notebooks[2]
    window.location.hash = `#/notebook/${target.id}`
    render(<App project={project} />)
    expect(screen.getByRole('button', { name: target.name }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('main', { name: `Notebook: ${target.name}` })).toBeDefined()
  })

  it('with no hash, the default selects initNotebookId', () => {
    expect(project.initNotebookId).toBe('nb-analysis')
    render(<App project={project} />)
    const initNotebook = project.notebooks.find(nb => nb.id === project.initNotebookId)
    expect(initNotebook).toBeDefined()
    expect(screen.getByRole('button', { name: initNotebook?.name ?? '' }).getAttribute('aria-current')).toBe('page')
  })

  it('reacts to a browser-driven hashchange after mount', async () => {
    render(<App project={project} />)
    const target = project.notebooks[1]
    window.location.hash = `#/notebook/${target.id}`
    // hashchange is async in jsdom; wait for the listener to settle.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: target.name }).getAttribute('aria-current')).toBe('page')
    })
    expect(screen.getByRole('main', { name: `Notebook: ${target.name}` })).toBeDefined()
  })
})
