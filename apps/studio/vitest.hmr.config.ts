import { defineConfig } from 'vitest/config'

// Dedicated node-env vitest config for the real HMR-edit-loop e2e (apps/studio/e2e). It is
// deliberately SEPARATE from vitest.config.ts (the always-on jsdom SPA suite) and from the
// root projects array: the HMR proof boots a live Vite dev server and a real headless
// Chromium, so it must not run in the fast, browser-free `pnpm test`. Run it via
// `pnpm --filter @deepnote/studio test:hmr` (or the dispatcher's verification step).
//
// Single-threaded with a long timeout: launching a browser + dev server is slow and must
// not contend with other workers on a constrained box.
export default defineConfig({
  test: {
    name: 'studio-hmr',
    environment: 'node',
    globals: true,
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 90_000,
    hookTimeout: 90_000,
    pool: 'forks',
    maxWorkers: 1,
  },
})
