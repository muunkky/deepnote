import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineProject } from 'vitest/config'

// DOM-env vitest project for apps/studio — the default SPA test runner for every
// later step (ADR-006 Negative consequence: the SPA suite is jsdom + RTL, distinct
// from the node-env backend suite). Referenced from the root vitest.config.ts
// `projects` array so `pnpm test` collects both suites in one run.
//
// The `@deepnote/runtime-server/types` alias mirrors apps/studio/tsconfig.json `paths`:
// the SPA consumes the canonical s1<->SPA contract (ADR-007 §6) TYPE-ONLY, so the import
// is elided by the esbuild transform before it ever resolves at runtime. The alias keeps
// the test runner's module resolution in lockstep with the typechecker (resolving the
// contract from package SOURCE, no backend `dist` build required) — a type-only edge, so
// it never pulls the runtime-server runtime entry or any `node:` builtin into the SPA.
const apiTypesEntry = fileURLToPath(new URL('../../packages/runtime-server/src/api-types.ts', import.meta.url))

// `@deepnote/blocks` is a RUNTIME (not type-only) dependency of the text renderer: it
// reuses `createMarkdownForTextBlock` to derive markdown for the seven text-cell kinds
// (design Phase 4 / card zy7tn8). The package's published `exports` point at `./dist`,
// which a worktree never builds, so — exactly as the tsconfig `@deepnote/*` paths glob
// does for the typechecker — resolve it from package SOURCE here so the DOM-env suite
// runs without a backend build. `@deepnote/blocks` is pure TypeScript with no `node:`
// builtin (verified), so this stays inside the ADR-006/007 browser-safe boundary.
const blocksEntry = fileURLToPath(new URL('../../packages/blocks/src/index.ts', import.meta.url))

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      '@deepnote/runtime-server/types': apiTypesEntry,
      '@deepnote/blocks': blocksEntry,
    },
  },
  test: {
    name: 'studio',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
