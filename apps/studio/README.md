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

> **Run `pnpm install` after pulling the `apps/*` workspace glob, or the `studio` vitest
> project will not be collected.** The root `vitest.config.ts` references
> `./apps/studio/vitest.config.ts`, which imports `@vitejs/plugin-react` at config-eval
> time. On a cold checkout that runs `pnpm test` **before** a fresh `pnpm install` has
> resolved this app's dependencies, that import fails to resolve and vitest reports a
> confusing **"project setup failed"** (with zero `studio` tests collected) instead of a
> clean test result. The fix is always a fresh `pnpm install` first — CI must order the
> install step before `pnpm test`.

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

## Execution transport (`src/execution/ExecutionClient.ts`)

The viewer's project load is read-only. **Running** a block adds the first runtime (non-type)
backend interaction the SPA has — a browser `WebSocket` to the local `deepnote serve` process and
`fetch` POSTs to its run routes. `ExecutionClient` is that seam ([ADR-005] proxy transport, design
`docs/designs/m3-s3-live-execution.md` Phase 1). It deliberately speaks **two** protocols:

- **Trigger over HTTP (KD-2).** `runBlock(blockId, notebookName)` POSTs
  `/api/notebooks/{nb}/blocks/{id}/run` and `runAll()` POSTs `/api/project/run`. Both return
  `202 { runId }` **synchronously**, so the SPA binds `runId → block(s)` at request time —
  deterministic, multi-tab-safe correlation, with no fragile "the next un-bound `run-start` event
  is mine" inference. A `429 { error:'queue-full' }` rejects a typed `RunTriggerError` with
  `reason:'queue-full'`; a `500 { error, failureCategory }` (kernel/engine start failure) rejects
  with `reason:'engine-start'` carrying the typed `KernelFailureCategory` for the actionable banner
  (KD-5); a pre-response network failure rejects with `reason:'network'`.
- **Stream + cancel over the WebSocket.** `WS /api/stream` is **subscribe-only**: `subscribe(onEvent)`
  delivers the ordered `runId`-tagged `WsServerEvent` broadcast (each caller filters to the `runId`s
  it owns) and returns an unsubscribe. A malformed inbound frame (a `JSON.parse` throw) is **dropped,
  not fatal**. `cancel(runId)` serializes exactly `{ type:'cancel', runId }`. The socket reconnects
  with a capped backoff on close (`connect()`/`close()`/`status` own the lifecycle); because the
  broadcast has no per-client replay, the owning store (step 3) resets in-flight blocks to `idle` on
  a reconnect so a missed terminal event never leaves a block pending forever.

The base-URL → WS-URL derivation (`streamUrl`) maps `http(s)://host` → `ws(s)://host/api/stream`,
resolving an empty base URL against the page origin (same-origin `deepnote serve`).

> **Boundary (load-bearing, [ADR-006]/[ADR-007]).** The WS/HTTP **shapes** (`WsClientMessage`,
> `WsServerEvent`, `RunId`, `KernelFailureCategory`) are `import type` from the Node-free
> `@deepnote/runtime-server/types` entry; the **transport** is the browser-native `fetch` +
> `WebSocket` globals. No backend runtime value, no `node:` builtin — asserted behaviourally by the
> `ExecutionClient`-specific case in `test-helpers/apps-studio-isolation.test.ts`, and by the
> capstone `tsc -p tsconfig.json --listFilesOnly` naming zero `apps/` files.

[ADR-005]: ../../docs/adr/ADR-005-browser-kernel-transport-proxy.md
[ADR-006]: ../../docs/adr/ADR-006-spa-framework-and-bundler.md
[ADR-007]: ../../docs/adr/ADR-007-server-spa-package-layout.md

## Execution state (`src/state/runStore.ts`, `src/execution/useExecution.ts`)

The transport above streams a flat `WsServerEvent` broadcast; the **execution state** is what turns
that stream into per-block run status the UI renders (design `m3-s3-live-execution.md` Phase 2).
Two pieces:

- **`runStore.ts` — a pure reducer.** `applyEvent(state, event, ctx)` folds one `WsServerEvent` into
  the `RunState` and returns a new state (no mutation, no socket — so it is unit-tested against
  scripted event sequences with zero I/O). `RunState` holds `byBlock` (each block's
  `BlockRunState`: `status` `idle | queued | running | done | failed`, live `outputs: IOutput[]`,
  `executionCount`, `truncated`, optional `failureCategory`), a `runs` map keyed by `runId`, and a
  server-level `kernelBanner`. The event → state contract, with its four review-pinned corrections:
  - `run-queued` → the run and its owned block(s) `queued` (the P1/idle path emits no `run-queued`,
    so a fast run goes straight to `running` with no `queued` flash — by design).
  - `run-start` → the run `running`. The reducer **does not read `run-start.totalBlocks`** — the
    backend emits it as a stub `0`; the real per-block `total` arrives on each `block-start` (**S1**).
  - `block-start` → that block `running` and its **outputs cleared** — a re-run replaces the prior
    output rather than appending (Jupyter cell semantics, **KD-3**).
  - `output` → append the `IOutput`; an `output` carrying `truncated: true` sets the back-pressure
    flag and appends nothing (R5).
  - `block-done` → that block `done`/`failed` by `success`, recording `failureCategory`; on success
    it bumps **that block's** `executionCount` — per-block, on `block-done`, **not** once per
    `run-done` (a run-all completes many blocks under one `run-done`, **M3**).
  - `run-done` → finalize the run. `run-failed` → set the `kernelBanner` and mark in-flight owned
    blocks `failed`. `run-cancelled` → return still-queued/running owned blocks to `idle`.
  - **Reconnect** (`applyReconnect`, a socket-close signal — not a `WsServerEvent`) resets every
    non-terminal block to `idle`: the broadcast has **no per-client replay**, so a terminal event
    lost across a drop must not strand a block `running`/`queued` forever (**S2**).
- **`useExecution.ts` — the React wire.** One client + one store per loaded project (the backend has
  one queue/kernel, KD-1). It holds the `RunState`, exposes `runBlock(blockId, nb)` / `runAll()` /
  `cancel(runId)` and a `blockState(blockId)` selector, and owns the **`runId → blockId(s)`
  correlation**. Per **KD-2** that binding is recorded at the moment the HTTP trigger resolves — the
  `runId` the `runBlock`/`runAll` promise returns is bound to the block(s) it ran **before** any
  event arrives — then handed to the reducer as `ctx.runIdToBlocks`, so a streamed frame carrying
  that `runId` updates exactly the originating block(s). The correlation is never inferred from the
  multi-producer broadcast. The hook also subscribes to the transport's reconnect signal and applies
  `applyReconnect` on a drop.

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

`OutputRenderer` itself renders persisted state only — no execution, no run affordance. It
consumes `IOutput` **type-only** from the `@deepnote/runtime-server/types` contract subpath
(re-exported there from `@deepnote/runtime-core`), so the SPA never takes a runtime edge on
`runtime-core` and the isolation invariant holds. The **same** renderer also renders the LIVE
session outputs the run loop streams (R2 — there is no second output renderer); see _Running blocks_
below.

## Running blocks (`src/execution/RunControl.tsx`, the `run` prop)

The s2 viewer is read-only (R8). The s3 run loop adds **exactly one** new mutating affordance — a
Run control on each executable block plus a project-level **Run all** — and renders the resulting
live outputs **in place through the existing `OutputRenderer`** (design `m3-s3-live-execution.md`
Phase 3, KD-3/KD-4/KD-6). Everything else stays inert.

- **`RunControl`** (`src/execution/RunControl.tsx`) — a Run `<button>` plus a status pill reflecting
  the block's `BlockRunStatus` (`idle | queued | running | done | failed`). It is inert in itself: it
  dispatches the caller's `onRun`; it runs nothing. It is **disabled** when the block cannot run (the
  KD-6 no-kernel gate). It carries `data-run-control` / `data-run-status` so the read-only-invariant
  allowlist can tell the run affordance apart from every other (inert) control.
- **The optional `run` prop** (`src/execution/blockRun.ts → BlockRun`) — `CodeRenderer` and
  `SqlRenderer` accept an OPTIONAL `run?: BlockRun` (status + live `outputs` + `executionCount` +
  `canRun` + `onRun`). It is **additive**: with no `run` a renderer keeps its s2 behaviour (no
  control, persisted outputs only) — which is what keeps the s2 renderer tests green and the viewer
  unchanged for an opened-but-not-run project. With it, the renderer shows its Run control and
  selects **LIVE vs PERSISTED** outputs.
- **Live-vs-persisted selection (KD-3).** A block's live outputs replace its persisted `block.outputs`
  once a session run **owns** the block — keyed on `status !== 'idle'` (`hasSessionRun`), **not** on
  `outputs.length`. The distinction is load-bearing: `block-start` clears the live outputs to `[]`
  before fresh frames stream, so a running block legitimately has empty live outputs and must not fall
  back to the stale persisted output. A re-run therefore **replaces** the prior output rather than
  appending (Jupyter cell semantics).
- **Wiring (`Shell.tsx` / `NotebookView.tsx`).** The `Shell` owns the single `ExecutionClient` +
  `useExecution` per loaded project (KD-1) and hosts the Run-all control; it builds a per-block
  `BlockRun` and plumbs it through `NotebookView → BlockRenderer`, which forwards the descriptor
  **only** to the executable renderers (`code`/`sql`). The client is injectable for tests; production
  constructs the same-origin `createExecutionClient()`. `App` passes
  `capabilities.kernelLanguage` down so the whole loop is capability-gated (KD-6: `null` → every run
  affordance renders disabled, never removed).
- **The read-only allowlist (KD-4).** `src/shell/readOnlyInvariant.test.tsx` renders the assembled
  Shell and asserts every interactive control is on the allowlist — a run affordance
  (`data-run-control` / `data-run-all`) or a pure navigation button (the notebook switcher, view
  state only) — and that no editable text/select/textarea control became mutable. The run loop is the
  single deliberate crossing of s2's R8 posture; this test fails if any other control turns mutable.

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

## Block-type coverage matrix + unknown-type fallback (`src/blocks/`)

`BlockRenderer` dispatches a persisted block to its registered renderer through a single
type-keyed registry (`BLOCK_RENDERERS`) plus a `default` branch. Every in-scope block type the
viewer supports has its own renderer registered into that map; the `default` branch is reserved
**structurally** for unknown types, so dispatch is exhaustive-by-construction (ADR-006 KDD §6).

| Block type(s)                                                                             | Renderer                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `code`                                                                                    | `CodeRenderer` (highlighted source + outputs)    |
| `markdown`                                                                                | `MarkdownRenderer` (sanitized prose)             |
| `sql`                                                                                     | `SqlRenderer`                                    |
| `text-cell-{p,h1,h2,h3,bullet,todo,callout}`                                              | `TextRenderer`                                   |
| `visualization`, `big-number`, `image`                                                    | their own renderers (see above)                  |
| `input-{text,textarea,checkbox,select,slider,date,date-range,file}`                       | read-only input renderers (`src/blocks/inputs/`) |
| `button`, `separator`                                                                     | `ButtonRenderer`, `SeparatorRenderer`            |
| _anything else_ (a future block kind, or `agent` / `notebook-function` not special-cased) | `UnknownBlockRenderer` (the `default` branch)    |

**Unknown-type policy (R5).** A block whose `type` is not registered — a future block kind, or one
the viewer deliberately does not special-case — must **never crash or blank the notebook view**.
`UnknownBlockRenderer` renders a labelled card: a clear `Unsupported block type: <type>` label plus
the block's **raw persisted `content`**, so the block stays visible and identifiable rather than
being silently dropped. The raw content is rendered as an **escaped React text node** (a `<pre>`),
not via `dangerouslySetInnerHTML`, so an unknown block whose content embeds `<script>` / `onerror=` /
`javascript:` markup is displayed literally and can never reach the DOM as live markup. The full
per-block-type coverage is asserted off the **live registry keys** (not a hardcoded list), so every
registered type is proven to resolve to its real renderer and only a genuinely-unregistered type
hits the fallback — the assertion stays honest as the registry evolves.

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
