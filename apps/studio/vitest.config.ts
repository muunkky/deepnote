import react from '@vitejs/plugin-react'
import { defineProject } from 'vitest/config'

// DOM-env vitest project for apps/studio — the default SPA test runner for every
// later step (ADR-006 Negative consequence: the SPA suite is jsdom + RTL, distinct
// from the node-env backend suite). Referenced from the root vitest.config.ts
// `projects` array so `pnpm test` collects both suites in one run.
export default defineProject({
  plugins: [react()],
  test: {
    name: 'studio',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
