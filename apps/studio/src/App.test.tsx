import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

// Smoke test for the React + Vite + jsdom + @testing-library/react pipeline.
// Proves the DOM-env vitest project renders a real component into a jsdom DOM
// before any non-trivial component exists (LUIVIEW1 step 2 capstone).
describe('App', () => {
  it('renders the Deepnote Studio heading into the DOM', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Deepnote Studio' })).toBeDefined()
  })
})
