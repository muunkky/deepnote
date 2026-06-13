import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Deepnote Studio SPA — Vite 7+ browser bundler / dev-server (ADR-006).
// This config governs ONLY apps/studio. The repo-root build (tsdown per package,
// the root tsc typecheck, Biome, cspell) never references it, keeping the backend
// packages provably free of any frontend toolchain (ADR-006 §isolation, ADR-007 §3).
export default defineConfig({
  plugins: [react()],
})
