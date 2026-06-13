import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// Browser entry point. The root element is declared in index.html; we look it up
// rather than asserting non-null so the strict Biome ruleset (noNonNullAssertion)
// stays satisfied by construction.
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
