import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HmrProbe } from './HmrProbe'

// Dedicated browser entry for the HMR probe page (apps/studio/e2e/hmr.e2e.ts serves this
// via index.hmr.html). Kept separate from src/main.tsx so the HMR proof drives a real Vite
// HMR boundary over the probe component without mounting the full app shell.
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <HmrProbe />
    </StrictMode>
  )
}
