# @deepnote/studio

The local, browser-based Deepnote UI: a React 19 + Vite 7 single-page application that
opens, edits, and reactively runs `.deepnote` projects against the
[`@deepnote/runtime-server`](../../packages/runtime-server) HTTP + WebSocket backend.

> **Fork-only — never sliced upstream.** This package is `"private": true` and lives only on
> the fork's `milestone/m3-local-ui` development branch. The clean `contrib/*` slice cut from
> `upstream/main` carries **no** `apps/` tree, so the upstream-contributable backend stays
> provably frontend-free by construction (PRD-003 Phase P7; ADR-006 Context).

## Dev run

From the repo root, with the workspace installed (`pnpm install`):

```bash
pnpm --filter @deepnote/studio dev      # Vite dev server with browser HMR (edit → reflect < 1s)
pnpm --filter @deepnote/studio build    # production SPA bundle
pnpm --filter @deepnote/studio preview  # serve the built bundle
pnpm --filter @deepnote/studio test     # the jsdom + @testing-library/react suite
```

`pnpm test`, `pnpm typecheck`, `pnpm lintAndFormat`, and `pnpm spell-check` at the repo root
all include this package — the SPA suite runs as a distinct DOM-env vitest **project** (see
the root `vitest.config.ts`), separate from the node-env backend suite.

## Why it is isolated — and how

Introducing a UI framework + browser bundler is a load-bearing, one-way decision
([ADR-006](../../docs/adr/ADR-006-spa-framework-and-bundler.md),
[ADR-007 §3](../../docs/adr/ADR-007-server-spa-package-layout.md)). The monorepo's
typecheck / build / lint / spell gate is **repo-wide by default**, so without explicit
isolation the new `.tsx` would red the backend's own CI gate. The isolation is configured,
not conventional:

- **The root `tsconfig.json` has an `include`** (`packages/*/src`, `test-helpers`, `*.config.ts`)
  that names **no** `apps/` path. The backend's `tsc -p tsconfig.json` therefore never sees this
  app's JSX. `apps/studio/tsconfig.json` is the app's own config; the root never references it
  (no `references`, not in the root `include`).
- **The dependency edge points one way.** The frontend toolchain (`react`, `react-dom`, `vite`,
  `@vitejs/plugin-react`, `@types/react*`) is declared **only** here. No `packages/*` manifest
  gains a frontend dependency; `apps/studio` imports no Node builtin and only the
  `@deepnote/runtime-server/types` Node-import-free subpath (never the server runtime entry).

These invariants are enforced, not assumed: `test-helpers/apps-studio-isolation.test.ts`
asserts (a) `tsc -p tsconfig.json --listFiles` emits zero `apps/` lines, (b) no `packages/*`
manifest declares a frontend dependency, and (c) `apps/studio` stays Node-free.
