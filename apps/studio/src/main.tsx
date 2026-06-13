import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { sampleProject } from './__fixtures__/sampleProject'
import { App } from './shell/App'

// Browser entry point. The root element is declared in index.html; we look it up
// rather than asserting non-null so the strict Biome ruleset (noNonNullAssertion)
// stays satisfied by construction.
//
// Step 3 renders the shell against the in-memory `: ApiProject` fixture (no network yet);
// step 4 swaps the fixture for the project fetched from the s1 server.
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App project={sampleProject.project} />
    </StrictMode>
  )
}
