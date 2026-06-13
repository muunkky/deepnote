import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './shell/App'

// Browser entry point. The root element is declared in index.html; we look it up
// rather than asserting non-null so the strict Biome ruleset (noNonNullAssertion)
// stays satisfied by construction.
//
// Step 4: `App` is the fetch container — on mount it reaches out over HTTP for the real
// project (`GET /api/project`, same origin), rendering a spinner while in flight, the shell
// once loaded, or an error banner on failure. No fixture is passed: the in-memory sample is
// now test-only.
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
