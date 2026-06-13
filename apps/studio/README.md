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

## Project load path

The app reaches out over HTTP for the real project on mount — there is no fixture in the
production path. The load is a single read-only seam (GET only; no POST/WS in this story):

- **`src/api/fetchProject.ts`** — `fetchProject(baseUrl = ''): Promise<ApiProject>` performs one
  `GET /api/project` and returns the **full** `ApiProject` envelope. On a non-2xx it throws a typed
  `ProjectLoadError` carrying the s1 server's own `{ error }` message (e.g. "deepnote-toolkit not
  installed") and the HTTP status; a pre-response network failure throws the same error with no
  status. The return type **is** the imported `ApiProject` — never a re-declared local shape — so a
  server contract change is a compile error, asserted by `fetchProject.test-d.ts`
  (`expectTypeOf<Awaited<ReturnType<typeof fetchProject>>>().toEqualTypeOf<ApiProject>()`).
- **`src/state/projectStore.ts`** — the `{ status: 'loading' } | { status: 'loaded'; project;
capabilities; activeNotebookId } | { status: 'error'; error }` discriminated state.
  `loadProjectState(loader = fetchProject)` runs the loader and maps success → `loaded` (resolving
  the initial notebook via the shared `initNotebookId` precedence) / failure → `error`.
- **`src/shell/App.tsx`** — the **fetch container**. On mount it runs the loader and renders the
  matching UI: a spinner (`role="status"`) while in flight, `<Shell>` once loaded, or an error
  banner (`role="alert"`) carrying `error.message` on failure (rendering only — no run/retry). The
  `loader`/`baseUrl` props are injectable so component tests drive all three states without a real
  socket; production passes neither, so the same-origin `fetchProject` runs.

> **`api-types` import boundary.** Both `fetchProject.ts` and `projectStore.ts` import **only**
> `import type { ApiProject } from '@deepnote/runtime-server/types'` — the Node-free `/types` entry.
> No runtime value, no `node:` builtin, no bare `@deepnote/runtime-server` runtime entry crosses
> into the SPA, keeping the one-way boundary intact (enforced by
> `test-helpers/apps-studio-isolation.test.ts`).

## Shell + routing model

The loaded view is driven entirely by an `ApiProject['project']` (the `GET /api/project` envelope's
`project` slice). The shape:

- **`src/shell/Shell.tsx`** — the loaded-project view. Owns the single piece of viewer state,
  `activeNotebookId`, and keeps it in lockstep with `location.hash` so every view is linkable. It
  renders the notebook list beside the active notebook and takes the project as a prop. `App`
  renders it once the load resolves (step 3 rendered this same view directly off the fixture; step 4
  put the fetch container in front of it with no change to the view itself).
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

## Output rendering (`src/outputs/`)

Persisted Jupyter `IOutput[]` (a code block's `block.outputs`) renders to the DOM through
`src/outputs/OutputRenderer.tsx` — the **browser counterpart to the terminal
[`packages/cli/src/output-renderer.ts`](../../packages/cli/src/output-renderer.ts)**. Both
dispatch on `output_type` over exactly the four types Jupyter persists, 1:1:

| `output_type`                     | Terminal (`renderOutput`) | Browser (`OutputRenderer`)                 |
| --------------------------------- | ------------------------- | ------------------------------------------ |
| `stream`                          | `renderStreamOutput`      | `StreamRenderer` (stderr styled)           |
| `display_data` / `execute_result` | `renderDataOutput` (MIME) | `DataRenderer` → MIME registry             |
| `error`                           | `renderErrorOutput`       | `ErrorRenderer` (ename/evalue + traceback) |

A parity-of-shape test pins the dispatch to exactly those four types — no fifth `output_type`
(e.g. `update_display_data`) is silently re-routed.

**Rich-first MIME precedence — the deliberate inversion.** The terminal prefers `text/plain`
(its richest renderable form) and prints `[HTML output — not rendered in terminal]` for
anything richer. The browser is a real DOM, so `src/outputs/mime/registry.ts` **inverts** that
ordering: `pickRenderer` walks a rich-first `MIME_PRECEDENCE` (`text/html` → image → svg →
`text/markdown` → `text/plain` last) and renders the richest representation a bundle carries —
an HTML dataframe table wins over its `text/plain` fallback. A bundle with no renderable MIME
type emits a typed `[Output with MIME types: …]` marker rather than dropping the output (parity
with the terminal fallback).

**Sanitization.** `text/html` and `image/svg+xml` become live DOM markup, so both are
DOMPurify-sanitized before injection — `text/markdown` reuses the shared
`renderMarkdownToSafeHtml` seam (the same sanitizer the markdown/text block renderers funnel
through). `text/plain` and stream/traceback text reach the DOM as escaped React text nodes
(no injection surface) and are ANSI-stripped (`src/outputs/ansi.ts`) so colour codes render as
text rather than leaking raw escape bytes — matching the terminal's traceback handling without
reaching for a `node:` builtin.

This is the read-only viewer: it renders persisted state only — no execution, no run
affordance. It consumes `IOutput` **type-only** from the `@deepnote/runtime-server/types`
contract subpath (re-exported there from `@deepnote/runtime-core`), so the SPA never takes a
runtime edge on `runtime-core` and the isolation invariant holds.

### Live HMR proof (`e2e/`)

`e2e/hmr.e2e.test.ts` is a real, timed HMR edit→reflect loop: it boots an actual Vite dev server
over this app, drives a real headless Chromium via the DevTools Protocol (`e2e/cdp.ts`, using
Node's built-in `WebSocket`/`fetch` — no Playwright/Puppeteer dependency), edits a real source
file (`src/__hmr_probe__/HmrProbe.tsx`), and asserts the running DOM reflects the change within an
HMR cycle **via a React Fast Refresh hot update** (it checks a `window` sentinel survives, proving
no full reload), recording the measured latency. The browser is the Playwright-cached Chromium;
override its path with `HMR_CHROME_BIN`. The probe edit is always restored afterwards.

## Visualization / big-number / image renderers (`src/blocks/`)

`visualization`, `big-number`, and `image` blocks each have their own read-only renderer, registered
additively into the `BlockRenderer` registry. All three are a **pure function of persisted state**
(R8) — nothing re-executes.

**Persisted-first, metadata-fallback (Key Design Decision M1).** `visualization` and `big-number`
both carry two potential sources of truth: their persisted `outputs[]` and their authoring metadata.
The rule is **prefer the persisted output; fall back to metadata only when `outputs` is empty** — a
block that has run carries the actual computed result (ground truth), while metadata is the
pre-execution authoring spec.

- **`VisualizationRenderer`** renders the persisted chart through the shared
  `OutputRenderer` / MIME registry (a persisted `image/png`, an HTML chart, or — as an additive
  registry upgrade, Decision 3a — a native vega/plotly bundle). It **never re-executes** the
  `deepnote_visualization_spec`; a chart that has never run (empty `outputs`) shows a labelled
  "not yet rendered" placeholder rather than a kernel call. Native vega/plotly is an additive
  MIME-registry entry that degrades to the persisted image, so the image path alone satisfies R3.
- **`BigNumberRenderer`** renders the persisted output tile when present; a never-run tile falls back
  to the `deepnote_big_number_title` / `_value` (+ optional comparison) authoring metadata.
- **`ImageRenderer`** renders the `deepnote_img_src` image, reusing `@deepnote/blocks`'
  `createMarkdown` image derivation and **sanitizing** the resulting `<img>` markup through DOMPurify
  before injection (an untrusted `javascript:`/`onerror` src cannot reach the DOM live).

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
