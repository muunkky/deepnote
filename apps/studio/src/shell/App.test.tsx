import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import { ProjectLoadError } from '../api/fetchProject'
import { App } from './App'

// App-level load integration (design Phase 3 capstone). The shell + routing behaviour is
// covered by Shell.test.tsx against the fixture; here we drive the THREE load states by
// injecting a loader thunk (so no real socket opens), and assert:
//   • loading  → a spinner / loading affordance, NOT the shell;
//   • loaded   → the real project renders (notebooks from the response appear in the DOM);
//   • error    → an error banner carrying the s1-surfaced message, NOT the shell.
//
// The `loader` prop is the test seam; in the browser `App` defaults it to `fetchProject`,
// so production wiring fetches `GET /api/project` for real (see main.tsx).

beforeEach(() => {
  window.location.hash = ''
})

afterEach(() => {
  window.location.hash = ''
})

/** A loader that never settles — lets us assert the synchronous loading state. */
function pendingLoader(): Promise<typeof sampleProject> {
  return new Promise<typeof sampleProject>(() => {})
}

describe('App — load lifecycle', () => {
  it('renders a loading affordance before the project resolves (not the shell)', () => {
    render(<App loader={pendingLoader} />)

    expect(screen.getByRole('status', { name: /loading/i })).toBeDefined()
    // The shell (notebook navigation) is NOT present while loading.
    expect(screen.queryByRole('navigation', { name: 'Notebooks' })).toBeNull()
  })

  it('renders the shell from the real fetched project on success', async () => {
    render(<App loader={() => Promise.resolve(sampleProject)} />)

    // The shell appears once loaded…
    const nav = await screen.findByRole('navigation', { name: 'Notebooks' })
    expect(nav).toBeDefined()
    // …and every notebook from the RESPONSE renders in the DOM (real data, not a fixture prop).
    for (const nb of sampleProject.project.notebooks) {
      expect(screen.getByRole('button', { name: nb.name })).toBeDefined()
    }
    expect(screen.getByRole('heading', { name: sampleProject.project.name })).toBeDefined()
  })

  it('renders an error banner with the s1-surfaced message on a non-2xx (not the shell)', async () => {
    const error = new ProjectLoadError('deepnote-toolkit not installed', 400)
    render(<App loader={() => Promise.reject(error)} />)

    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain('deepnote-toolkit not installed')
    // The shell never renders on the error path.
    expect(screen.queryByRole('navigation', { name: 'Notebooks' })).toBeNull()
  })

  it('does not leave the loading affordance up once the error state is reached', async () => {
    render(<App loader={() => Promise.reject(new ProjectLoadError('boom', 500))} />)

    await screen.findByRole('alert')
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    })
  })
})
