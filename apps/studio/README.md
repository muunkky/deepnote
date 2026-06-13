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

A separate, browser-driven HMR end-to-end check lives outside that always-on suite:

```bash
pnpm --filter @deepnote/studio test:hmr     # real timed Vite-HMR edit→reflect proof
```

It is **not** part of `pnpm test` because it boots a live Vite dev server and a real headless
Chromium — see "Live HMR proof" below.

## Shell + routing model

The app is a read-only viewer shell driven entirely by an `ApiProject` (the `GET /api/project`
envelope; step 3 supplies an in-memory fixture, step 4 a real fetch). The shape:

- **`src/shell/App.tsx`** — the shell. Owns the single piece of viewer state, `activeNotebookId`,
  and keeps it in lockstep with `location.hash` so every view is linkable. It renders the
  notebook list beside the active notebook and takes the project as a prop (so step 4 swaps the
  fixture for a fetch with no shell change).
- **`src/shell/NotebookList.tsx`** — the left-hand list: one focusable `<button>` per notebook;
  the active entry carries `aria-current="page"`. Clicking selects + routes.
- **`src/shell/NotebookView.tsx`** — the main pane: the active notebook's `blocks[]` rendered
  top-to-bottom in **persisted array order** via `BlockRenderer`.
- **`src/blocks/BlockRenderer.tsx`** — a placeholder stub for now (a labelled element per block);
  the real type-keyed registry arrives in later steps.

**Routing** is a single linkable hash route, `#/notebook/<id>` (`src/shell/hashRoute.ts`).
Selection precedence (`src/shell/viewModels.ts → resolveActiveNotebookId`): a valid hash id wins,
else the project's `initNotebookId`, else the first notebook. Browser-driven hash changes
(back/forward, a pasted deep link) flow back into state through a `hashchange` listener.

**View-models are derived, never re-declared.** `ProjectVM = ApiProject['project']` and
`NotebookVM`/`BlockVM` derive from it; the fixture is typed `: ApiProject`. Per ADR-007 §6 the
SPA consumes the canonical `@deepnote/runtime-server/types` contract **type-only** — a server
contract change becomes a compile error here rather than silent drift. The
`@deepnote/runtime-server/types` alias (in `tsconfig.json` `paths` and the studio
`vitest.config.ts` `resolve.alias`) resolves that type from package source, so the typecheck and
the DOM-env suite work in a worktree without first building the backend `dist`; it stays a
type-only edge (the isolation test still forbids the bare runtime entry or any `node:` builtin).

### Live HMR proof (`e2e/`)

`e2e/hmr.e2e.test.ts` is a real, timed HMR edit→reflect loop: it boots an actual Vite dev server
over this app, drives a real headless Chromium via the DevTools Protocol (`e2e/cdp.ts`, using
Node's built-in `WebSocket`/`fetch` — no Playwright/Puppeteer dependency), edits a real source
file (`src/__hmr_probe__/HmrProbe.tsx`), and asserts the running DOM reflects the change within an
HMR cycle **via a React Fast Refresh hot update** (it checks a `window` sentinel survives, proving
no full reload), recording the measured latency. The browser is the Playwright-cached Chromium;
override its path with `HMR_CHROME_BIN`. The probe edit is always restored afterwards.

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
