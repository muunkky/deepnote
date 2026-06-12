# Design Doc: Read-only viewer SPA — `apps/studio` over the s1 HTTP API (m3/s2)

> **ADRs**: [ADR-006](../adr/ADR-006-spa-framework-and-bundler.md) (React 19 + Vite 7, `apps/studio`, toolchain isolation) · [ADR-007](../adr/ADR-007-server-spa-package-layout.md) (package layout, Node-free `api-types` entry) | **PRD**: [PRD-003](../prds/PRD-003-local-deepnote-ui.md) (m3 master, Phase P2, Scenario 1) | **Date**: 2026-06-12 | **Author**: muunkky

## Overview

This design implements **PRD-003 Phase P2: the read-only viewer SPA** — roadmap story `m3/s2`,
"Open & view a notebook locally." It is the first frontend the monorepo has ever had. A user runs
`deepnote serve quarterly.deepnote` (the s1 wedge from `m3/s1`), a browser opens, and they see
their project's notebook(s) in a left-hand list with the active notebook rendered top-to-bottom —
markdown as prose, code with syntax highlighting and its **last-saved outputs**, a SQL block with
its query and result table, a big-number tile, an input showing its current value, a chart. Nothing
executes; this is the project's **persisted state**, rendered. That is exactly PRD Scenario 1 and
the whole of P2: _no execution, no editing_ — those are P3/P4, out of scope here.

The two ADRs already decided the load-bearing questions and this doc does not relitigate them.
ADR-006 fixed the framework (**React 19 + TypeScript**) and bundler (**Vite 7 +
`@vitejs/plugin-react`**) and the **toolchain-isolation mechanism** (a root-`tsconfig` `"include"`
that stops globbing `apps/`, plus `apps/studio`'s own `jsx: "react-jsx"` config). ADR-007 fixed the
**layout** (`apps/studio`, `private`, fork-only; the SPA imports **only** the server's Node-free
`api-types` entry, never the server runtime). This doc takes those as given and works out _how_ to
build the viewer on top of them with enough detail that the `m3/s2` sprint cards are mechanical to
create — one card per roadmap feature, no design decisions left to the sprint-architect.

The work splits into the two roadmap projects under `m3/s2`: **`spa-foundation`** (scaffold the
isolated app, build the shell + routing, load a project over the s1 API into app state) and
**`block-renderers`** (a read-only DOM renderer per block type, the Jupyter `IOutput` MIME
renderer, and a safe unknown-type fallback). The single largest, riskiest surface is the
`IOutput`/rich-output rendering — the browser counterpart to the terminal
`packages/cli/src/output-renderer.ts` — which we build as a **rendermime-style MIME→renderer
dispatch**, precisely the React-ecosystem leverage ADR-006 was chosen to unlock.

## Requirements

The implementation is complete when:

- **R1 — The app is isolated by construction.** `apps/studio` exists as a React 19 + Vite 7 package
  whose entire frontend toolchain lives in `apps/studio/package.json`; **no `packages/*`
  `package.json` gains a frontend dependency**; and on the fork dev branch
  `tsc --noEmit -p tsconfig.json --listFiles` names **zero** files under `apps/` (the backend's
  PR-gating typecheck stays green despite the SPA's JSX). _(ADR-006 Decision §3–4; ADR-007 §3–4.)_
- **R2 — The SPA carries zero backend runtime coupling, and consumes the s1 contract type directly.**
  `apps/studio` imports the server's request/response/event **types only**, from the Node-import-free
  `api-types` entry (ADR-007 §6) — specifically it `import type { ApiProject }` (the s1-owned canonical
  `GET /api/project` contract) and derives all view-models from `ApiProject['project']`; it does **not**
  re-declare a local project shape. A `madge`/`dependency-cruiser` check (or grep) confirms no value
  import of the server runtime, no Node import reachable from the SPA, and no `packages/* → apps/*` edge.
  _(ADR-007 §4, §6.)_
- **R3 — Every in-scope block type renders.** code, sql, markdown, text (all 7 text-cell kinds),
  visualization, the **eight** input kinds (text/textarea/checkbox/select/slider/date/date-range/
  file), button, big-number, image, separator each render correctly in the browser from a fixture
  project. _(PRD UI-shell success criterion "Per-block-type rendering"; `m3/s2` SC1.)_
- **R4 — Persisted Jupyter `IOutput`s render in the DOM.** A MIME-dispatch renderer covers
  `stream`, `display_data`, `execute_result`, and `error` — the browser counterpart to
  `output-renderer.ts` — including HTML dataframe tables, images, and ANSI/error tracebacks.
  _(`m3/s2` SC4; PRD "DOM rendering of Jupyter `IOutput`s.")_
- **R5 — Unknown block types fall back safely.** An unsupported/unknown `type` renders a labelled
  raw-content fallback rather than throwing and blanking the notebook view. _(PRD Scenario 1 edge
  case; `m3/s2` SC2.)_
- **R6 — The shell loads a real project over the s1 API.** The SPA fetches a project from the s1
  server (`GET /api/project`), shows a notebook list, routes to the active notebook, and renders its
  blocks top-to-bottom from app state. _(`m3/s2/spa-foundation` features.)_
- **R7 — Time-to-first-render meets the bar, split by responsibility (S2).** The PRD's "< 10 s from
  `deepnote serve` to a rendered notebook" on the reference workload (a ~20-block notebook, warm kernel,
  ready interpreter) is two distinct measurements with two owners: **(a) shell-to-render** — the time
  from the browser hitting an **already-running** server to a fully rendered notebook — is the viewer's
  kernel-free responsibility and the bar this story is **graded on** (it has no kernel in the loop, so
  it should be well inside the budget); **(b) cold `deepnote serve`-to-render** — the full command-to-
  pixels time, which includes server boot/interpreter readiness — is **gated by s1 boot** and is
  **s1-owned**. This story measures and is accountable for (a); (b) is reported but bounded by s1.
  _(PRD UI-shell criterion "Time-to-first-render"; `m3/s2` SC3.)_
- **R8 — Read-only is enforced.** The viewer renders persisted state only: no run controls wired,
  no editors, no save path. Nothing in the SPA can mutate the project or the file. _(PRD P2 scope:
  "No execution, no editing yet.")_

## Current State

- **There is zero frontend in the monorepo.** `find packages -name '*.tsx' -o -name '*.jsx'`
  returns 0 files; no `package.json` declares a direct dependency on react, react-dom, vite, or
  `@vitejs/*`. The toolchain is Biome 2.2.7 + Prettier 3.6.2 + tsdown 0.15.9 + vitest 4.1.8 +
  tsc 5.9.3 + cspell 9.2.2. There is exactly **one** `tsconfig.json` (the root) and it has **no
  `include` key** (only `"exclude": ["node_modules", "dist"]`), `strict: true`,
  `moduleResolution: bundler`, and **no `jsx` option set**. The workspace glob is `packages/*` only.
- **The block model is rich and fully typed.** `packages/blocks/src/deepnote-file/deepnote-file-schema.ts`
  is a zod schema whose `DeepnoteBlock` is a discriminated union on a string `type` literal:
  `markdown`, `image`, `separator`, `text-cell-{p,h1,h2,h3,bullet,todo,callout}`, `code`, `sql`,
  `notebook-function`, `visualization`, `button`, `big-number`, `agent`, and
  `input-{text,textarea,checkbox,select,slider,date,date-range,file}`. The project envelope is
  `DeepnoteFile.project.notebooks[]`, each `{ id, name, blocks: DeepnoteBlock[], executionMode? }`.
- **Executable blocks carry persisted outputs.** `executableBlockFields` adds
  `outputs?: IOutput[]` (typed `z.array(z.any())` in zod, but semantically Jupyter `IOutput[]`),
  plus `executionCount`, `executionStartedAt`, `executionFinishedAt`. `code`, `sql`,
  `visualization`, `big-number`, and `agent` blocks are output-bearing; `input-*`, `button`,
  `markdown`, `text-cell-*`, `image`, and `separator` are not.
- **The terminal renderer is the reference, and it is terminal-only.**
  `packages/cli/src/output-renderer.ts` exports `renderOutput(output: IOutput)`, dispatching on
  `output.output_type` (`stream` / `display_data` / `execute_result` / `error`) and, for data
  outputs, **preferring `text/plain`** and emitting placeholders for `text/html`
  (`[HTML output - not rendered in terminal]`) and images. The `IOutput` types come from
  `@jupyterlab/nbformat`, re-exported by `@deepnote/runtime-core`
  (`IDisplayData`, `IError`, `IExecuteResult`, `IOutput`, `IStream`). The DOM renderer mirrors this
  dispatch shape but renders the rich MIME bundles the terminal had to drop.
- **The s1 server does not exist yet — but its contract is fixed.** `m3/s1/serve-api` ships
  `@deepnote/runtime-server` with `GET /api/project` returning the project metadata + notebook/block
  tree (reusing `deserializeDeepnoteFile`). Per ADR-007 §6 its request/response/event **types** live
  in a Node-import-free `api-types` entry that `apps/studio` imports. _This story (`m3/s2`) depends
  on `m3/s1`; the viewer is the first consumer of that API._
- **There is one prior design doc** (`docs/designs/phase1-alternative-language-kernels.md`); the
  `docs/designs/` directory exists. No prior `apps/` work, no prior frontend cards.

## Target State

After all phases, the fork dev branch has a new top-level `apps/` tier with one app:

```
deepnote/ (fork dev branch)
├── tsconfig.json                 # root — now has "include" naming NO apps/ path
├── pnpm-workspace.yaml           # packages/* AND apps/*  (apps/* line: ADR-007, process-diff only)
├── packages/                     # backend — slices clean; never imports apps/
│   ├── runtime-server/           # s1 wedge; exports Node-free api-types entry (ADR-007 §6)
│   ├── blocks/                   # DeepnoteBlock model the renderers dispatch on
│   └── ...
└── apps/
    └── studio/                   # @deepnote/studio · private · fork-only · React 19 + Vite 7
        ├── package.json          # ALL frontend deps live here, nowhere else
        ├── tsconfig.json         # jsx: "react-jsx"  — root tsconfig never references this
        ├── vite.config.ts        # browser dev-server + production rollup build
        ├── index.html
        └── src/
            ├── main.tsx          # React root
            ├── api/              # fetch GET /api/project; types from runtime-server/api-types
            ├── state/            # project load state (loading / loaded / error)
            ├── shell/            # App, NotebookList, NotebookView (top-to-bottom render)
            ├── blocks/           # one read-only renderer per block type + BlockRenderer dispatch
            └── outputs/          # OutputRenderer (IOutput dispatch) + MIME→renderer registry
```

Data flow (read-only, one direction — no run, no save):

```
deepnote serve project.deepnote   ◄── --static-dir apps/studio/dist supplied by the FORK's launch
        │                              wrapper (ADR-007 §2 / s1 R1); NEVER defaulted in sliced serve.ts
        │ serves SPA bundle + GET /api/project
        ▼
browser ── fetch GET /api/project ──► runtime-server (Node) ── deserializeDeepnoteFile ──► .deepnote
        │                                                                                      │
        ◄──────────────── ApiProject (s1 api-types, JSON — full envelope) ─────────────────────┘
        │
   projectStore (React state — view-models derived from ApiProject['project'])
        │
   App ──► NotebookList (route select)        ──► active notebookId
        └─► NotebookView(notebook.blocks[])
                 └─► BlockRenderer(block)            ── dispatch on block.type ──┐
                        ├─ MarkdownRenderer / CodeRenderer / SqlRenderer / ...    │
                        ├─ Input*Renderer (8) / ButtonRenderer / SeparatorRenderer│
                        ├─ BigNumberRenderer / ImageRenderer / VisualizationRenderer
                        └─ UnknownBlockRenderer (fallback)  ◄── default branch ───┘
                              │
                 OutputRenderer(block.outputs[])   ── dispatch on output_type ──┐
                        ├─ StreamRenderer / ErrorRenderer                        │
                        └─ DataRenderer ── MIME registry (html/image/vega/...) ──┘
```

The viewer is **purely a function of persisted state**: `render(ApiProject) → DOM`. No
WebSocket, no run endpoint, no mutation — those edges are added in P3/P4 and are explicitly absent
here (R8).

## Design

### Architecture

The SPA is a single read render pipeline with three layers, each mapping to a roadmap project/feature.

**1. Foundation (`spa-foundation`).** The isolated package, the shell, and the load path.

- **`apps/studio` package** — the React 19 + Vite 7 app. All frontend deps confined here (ADR-006
  §3). Its own `vite.config.ts`, its own `tsconfig.json` (`jsx: "react-jsx"`), `index.html`, `src/`.
- **API client + load state (`src/api`, `src/state`)** — a `fetchProject(): Promise<ApiProject>` that
  calls `GET /api/project` and returns the **full** s1 `ApiProject` envelope, and a `projectStore`
  holding a discriminated load state `{ status: 'loading' } | { status: 'loaded'; project } | { status:
'error'; error }`. The type is `ApiProject`, imported **only** from `@deepnote/runtime-server`'s
  Node-free `api-types` entry (R2) — the viewer does not re-declare it. View-models are derived from
  `ApiProject['project']`; the envelope's `capabilities` field is consumed too (it drives the
  "kernel missing" UI state from s1 KD-6). State management is React built-ins (`useState`/`useReducer`
  - a small context or one Zustand store); a heavy state library is unwarranted for a read-only viewer.
- **App shell + routing (`src/shell`)** — `<App>` owns the load state and renders `<NotebookList>`
  (left rail) + `<NotebookView>` (active notebook). Routing selects which notebook is active. For a
  localhost single-page viewer with a known, small notebook set, routing is **in-app state**
  (selected `notebookId`, optionally reflected in the URL hash `#/notebook/<id>`); we do **not** add
  `react-router` — a hash/state selector is sufficient and keeps the dependency surface minimal.
  `<NotebookView>` renders `notebook.blocks` **top-to-bottom in array order** (the `.deepnote`
  block order is the display order), one `<BlockRenderer>` per block.

**2. Block renderers (`block-renderers`).** A read-only renderer per block type behind one dispatcher.

- **`BlockRenderer` (`src/blocks/BlockRenderer.tsx`)** — the single dispatch point. It switches on
  `block.type` and delegates to the matching renderer; the `default` branch is `UnknownBlockRenderer`
  (R5). This mirrors the structure of `output-renderer.ts`'s `renderOutput` switch, lifted to React
  components and to `block.type` instead of `output_type`. The dispatch is a `Record<BlockType,
Component>` registry plus a fallback, so adding a renderer later (P3 editors) is a registry entry,
  not a switch edit.
- **Per-type renderers (`src/blocks/*Renderer.tsx`)** — each is a pure, read-only presentational
  component taking its narrowed block type. They reuse the `@deepnote/blocks` type guards
  (`isCodeBlock`-style) and helpers where they exist (e.g. `createMarkdownForTextBlock`,
  `createMarkdownForImageBlock` already turn text/image blocks into markdown/HTML) rather than
  re-deriving formatting. Output-bearing renderers (code, sql, visualization, big-number) embed an
  `<OutputRenderer>` for their persisted `block.outputs`.

**3. Output rendering (`ioutput-mime-renderer`).** The browser counterpart to `output-renderer.ts`.

- **`OutputRenderer` (`src/outputs/OutputRenderer.tsx`)** — takes `IOutput[]` and dispatches each on
  `output_type` exactly as the terminal renderer does: `stream → StreamRenderer`,
  `display_data | execute_result → DataRenderer`, `error → ErrorRenderer`. This is the **same
  dispatch shape** as `renderOutput`, so the two renderers stay conceptually paired (R4).
- **MIME registry (`src/outputs/mime/`)** — a **rendermime-style MIME→renderer dispatch**: a
  registry mapping MIME types to React renderers, with a precedence order. Where the terminal
  renderer _had_ to prefer `text/plain` and print `[HTML output - not rendered]`, the DOM renderer
  inverts the precedence to prefer the **richest** renderable bundle: `text/html` (dataframe tables)
  > image (`image/png`, `image/jpeg`, `image/svg+xml`) > `application/vnd.vega(-lite)+json` /
  > `application/vnd.plotly.v1+json` (visualizations) > `text/markdown` > `text/plain` (last resort,
  > including ANSI). This is the React-ecosystem leverage ADR-006 was chosen for: the registry is
  > composed from existing React renderers (`@jupyterlab/rendermime`-style dispatch,
  > `react-vega`/`react-plotly.js`, a syntax/markdown stack) rather than hand-authored MIME plumbing.

### Key Design Decisions

These are implementation-level choices, not ADR re-decisions.

1. **The MIME registry inverts the terminal renderer's `text/plain`-first precedence.**
   `output-renderer.ts` prefers `text/plain` and drops HTML/images by necessity (a terminal can't
   show them). The DOM renderer's value is precisely that it _can_, so its precedence prefers the
   richest renderable MIME and falls back down the chain to `text/plain` only when nothing richer is
   present. Keeping the registry **data-driven** (a precedence-ordered map) rather than a hardcoded
   `if/else` cascade is what lets P3 add execute-time output and lets us register
   `vega`/`plotly`/HTML renderers independently — and it is the shape the React notebook ecosystem
   already ships, so we compose rather than author (ADR-006 Key Factor 1).

2. **HTML/SVG outputs are sanitized before injection.** Persisted `text/html` (pandas dataframe
   tables) and `image/svg+xml` must render as DOM, which means `dangerouslySetInnerHTML`. Even
   though the project is local and trusted (PRD localhost trust boundary), unsanitized injection of
   arbitrary notebook HTML is a defect, not a risk we accept silently: the HTML/SVG renderers pass
   content through a sanitizer (DOMPurify-class) before injection. This is a renderer-internal
   decision; the alternative (raw injection) is rejected as a latent XSS/DOM-corruption footgun for
   a fork showcase meant to read cleanly to maintainers.

3. **Visualization blocks prefer the persisted image, with native vega/plotly as a registry
   upgrade.** PRD Open Questions left "render vega/plotly natively vs. fall back to the persisted
   image" to the P2/P3 design doc. Decision for P2: the `VisualizationRenderer` renders whatever the
   block **persisted** — in practice an image or an HTML/vega bundle in `block.outputs` — through the
   **same `OutputRenderer`/MIME registry** every output-bearing block uses. We do **not** re-execute
   the `deepnote_visualization_spec` (that needs a kernel; out of scope, R8). Native vega/plotly is
   simply a MIME-registry entry (`application/vnd.vega*+json`, `application/vnd.plotly.v1+json`): if
   the persisted output carries a vega/plotly bundle, the registry renders it natively; otherwise the
   persisted image renders. This keeps the viewer a pure function of persisted state and unifies the
   chart path with every other output, instead of a bespoke visualization-execution path.

   **Output-vs-metadata precedence (M1).** Both `visualization` and `big-number` carry _two_ potential
   sources of truth: their persisted `block.outputs[]` **and** block metadata
   (`deepnote_big_number_title`/`_value`/`_comparison_*` for big-number; the viz spec for visualization).
   The rule is **prefer the persisted output; fall back to metadata only when `outputs` is empty**. A
   block that has run carries a rendered output that reflects the actual computed value — that is the
   ground truth — and metadata is the pre-execution authoring spec. So a big-number that has executed
   renders its persisted output tile; a big-number that has never run (empty `outputs`) renders from its
   `deepnote_big_number_*` metadata; same shape for visualization (persisted bundle/image first, the
   authoring spec only as a no-output fallback that still does not re-execute).

3a. **Native vega/plotly is an additive registry entry, not a P2 gate.** The P2 launch bar (R3/R4)
is met by rendering the _persisted_ visualization output through the MIME registry's image/HTML
path. Registering the `react-vega`/`react-plotly.js` renderers for the vega/plotly MIME types is
in scope for `viz-bignumber-image-renderers` **when the persisted bundle is a vega/plotly spec**,
but if pulling those libraries in proves heavier than the showcase warrants, the fallback-to-image
path already satisfies R3 — so the native path can degrade to the persisted image without failing
the phase. The registry's data-driven shape (Decision 1) is what makes this a one-line
add/remove, not a rework.

4. **Routing is in-app state (hash), not `react-router`.** A read-only localhost viewer over a
   single project with a handful of notebooks does not need a router. A selected-`notebookId` in
   state, optionally mirrored to `location.hash`, gives deep-linkable notebooks with zero new
   dependency. `react-router` would be dead weight on a fork showcase; if a future phase (P3+) needs
   richer navigation it can be added then. (Take-the-long-route here means _not_ over-building
   navigation for a viewer.)

5. **State is React built-ins (or one tiny store), not Redux/heavy state libs.** The viewer's state
   is "the loaded project + which notebook is selected." `useReducer` + context (or a single Zustand
   store) covers it. Read-only means no optimistic updates, no mutation reconciliation — the heavy
   machinery those libraries exist for is absent (R8). We keep the dependency surface small so the
   fork showcase reads cleanly and the P3/P4 phases can choose their own execution-state model
   without inheriting an over-fit one.

6. **The renderer registry is keyed by the exact `block.type` discriminant, with the fallback as the
   `default`.** Because `DeepnoteBlock` is a discriminated union on `type`, the dispatcher is
   exhaustive-by-construction over known types and the `default` branch _is_ the unknown-type
   fallback (R5). This means an unrecognized type (a future block kind, or `agent`/`notebook-function`
   we choose not to special-case in the viewer) renders the labelled raw-content fallback rather than
   crashing — the same defensive posture the terminal path has, made structural.

### Interface Design

**API surface consumed: the s1-owned `ApiProject`, imported — not re-declared (C1).** The contract type
is owned and exported by `m3/s1/serve-api`'s Node-free `api-types` entry as the canonical `ApiProject`
(the `GET /api/project` payload). The viewer **imports it** and derives every view-model from it; it does
**not** hand-redeclare a `ProjectResponse`/`NotebookSummary` shape — a local copy would defeat the
ADR-007 §6 compile-time drift-catch (the whole point of the shared type). The SPA imports _only_ this
type; it never imports the server factory or any Node module (R2).

```ts
// THE import — the single source of truth for the contract (s1 owns it):
import type { ApiProject } from "@deepnote/runtime-server/types";

// ApiProject (defined in s1) is the FULL envelope:
//   { path, metadata, project: DeepnoteFile['project'], openHash, capabilities }
// The viewer consumes the whole envelope (capabilities drives the KD-6 "kernel missing" UI state).

// View-models are DERIVED from the imported type, never re-declared:
type ProjectVM = ApiProject["project"]; // { id, name, initNotebookId?, notebooks[] }
type NotebookVM = ProjectVM["notebooks"][number]; // { id, name, blocks: DeepnoteBlock[], executionMode? }
```

**API client (`src/api/fetchProject.ts`).**

```ts
// Read-only: GET only. No POST, no WS in this story (R8). Returns the FULL ApiProject envelope.
export async function fetchProject(baseUrl = ""): Promise<ApiProject>;
// throws a typed ProjectLoadError on non-2xx / network failure → drives the error state
```

**Load state (`src/state/projectStore.ts`).**

```ts
type ProjectState =
  | { status: "loading" }
  | {
      status: "loaded";
      project: ApiProject["project"];
      capabilities: ApiProject["capabilities"];
      activeNotebookId: string;
    }
  | { status: "error"; error: ProjectLoadError };
```

**Block dispatch (`src/blocks/BlockRenderer.tsx`).**

```ts
export interface BlockRendererProps {
  block: DeepnoteBlock;
} // read-only: block in, DOM out
// Registry: Partial<Record<DeepnoteBlock['type'], FC<{ block: DeepnoteBlock }>>>
// default branch → <UnknownBlockRenderer block={block} />
export function BlockRenderer({ block }: BlockRendererProps): JSX.Element;
```

**Output dispatch (`src/outputs/OutputRenderer.tsx`) — mirrors `renderOutput`.**

```ts
export interface OutputRendererProps {
  outputs: IOutput[];
} // IOutput from @deepnote/runtime-core (type-only)
// per output: output_type === 'stream'        → <StreamRenderer>
//             'display_data' | 'execute_result'→ <DataRenderer>  (MIME registry)
//             'error'                          → <ErrorRenderer>
export function OutputRenderer({ outputs }: OutputRendererProps): JSX.Element;
```

**MIME registry (`src/outputs/mime/registry.ts`) — the rendermime-style dispatch.**

```ts
// Precedence-ordered; first match in a data bundle wins. Inverts output-renderer.ts (rich-first).
// `data` is `unknown` (M2): a Jupyter IMimeBundle value is `string | string[]` for text/image MIME
// types, but JSON-bundle MIME types (vega/vega-lite/plotly) carry a *parsed JSON object*, not a string.
// `string | string[]` would not type-check the vega/plotly renderers, so the renderer prop is widened.
type MimeRenderer = FC<{ data: unknown }>; // each renderer narrows internally (e.g. vega: data is a spec object)
const MIME_PRECEDENCE: string[] = [
  "text/html", // dataframe tables (sanitized) — string | string[]
  "image/png",
  "image/jpeg",
  "image/svg+xml", // string (base64) | string[]
  "application/vnd.vega.v5+json",
  "application/vnd.vegalite.v5+json", // JSON object
  "application/vnd.plotly.v1+json", // JSON object
  "text/markdown",
  "text/plain", // last resort (ANSI-aware), matches terminal fallback
];
const MIME_REGISTRY: Record<string, MimeRenderer>;
export function pickRenderer(data: Record<string, unknown>): {
  mime: string;
  render: MimeRenderer;
};
```

**Root toolchain interfaces (the isolation mechanism — ADR-006 §4, ADR-007 §3).**

```jsonc
// tsconfig.json (root) — add an "include" that provably names NO apps/ path.
// Before: no "include" key (globs every .ts/.tsx in repo → would fail on apps/studio JSX).
{
  "include": ["packages/*/src", "test-helpers", "*.config.ts"],
  "exclude": ["node_modules", "dist"],
}
```

```jsonc
// apps/studio/tsconfig.json — own config the root NEVER references (no `references`, not in root include)
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
  },
}
```

```yaml
// pnpm-workspace.yaml — add the apps/* glob (rides the process diff only, never upstream)
packages:
  - 'packages/*'
  - 'apps/*'
```

**Verification invariant:** after the root `include` lands, `tsc -p tsconfig.json --listFiles`
prints **zero** paths under `apps/` (R1). This is the load-bearing one-line change and it must land
**with** the `apps/*` glob, or the backend's typecheck job goes red on the SPA's JSX.

## Implementation Phases

The phases are the two roadmap projects, sequenced so each is independently deployable: after the
`spa-foundation` phases the app loads and shows a project (with placeholder blocks); each
`block-renderers` phase lights up more block types. The MIME-renderer phase lands before/with the
output-bearing renderers so code/sql/viz have outputs to show. Every phase ships its own component
tests against fixtures (TDD: test first, then the component that satisfies it).

---

### Phase 1: Framework + bundler introduced, isolated (`spa-foundation/framework-bundler-setup`)

**Goal:** `apps/studio` exists as a React 19 + Vite 7 app, and the backend's repo-wide
typecheck/build/lint/spell gate stays green on the fork dev branch despite the new JSX.

**Deliverables:**

- `apps/studio/` with `package.json` (`@deepnote/studio`, `"private": true`; deps `react`,
  `react-dom`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`), `vite.config.ts`,
  own `tsconfig.json` (`jsx: "react-jsx"`), `index.html`, `src/main.tsx` rendering a trivial root.
- `pnpm-workspace.yaml` gains the `apps/*` glob.
- Root `tsconfig.json` gains `"include"` that names no `apps/` path (the isolation fix).
- `cspell.json` / `docs-dictionary.txt` gain React/Vite/JSX terms; Biome `a11y`/`noExplicitAny` now
  apply to `.tsx` (satisfied, not relaxed).
- A DOM-env vitest project entry scoped to `apps/studio` (jsdom/happy-dom + `@testing-library/react`)
  — distinct from the node-env backend suite (ADR-006 Negative consequence).

**Test strategy (TDD):**

- **Isolation test (the load-bearing one):** a CI/script assertion that
  `tsc -p tsconfig.json --listFiles | grep -c apps/ == 0` (R1) — written before the `apps/*` glob is
  added, proving the root `include` excludes the SPA.
- **Boundary test:** a `madge`/`dependency-cruiser` (or grep) check that no `packages/*` imports
  `apps/`, and `apps/studio` imports no Node module / no server runtime value (R2).
- **Smoke component test:** the trivial root renders under the new DOM-env vitest project (proves the
  React+Vite+jsdom+RTL pipeline works end-to-end before any real component exists).

**Infrastructure:** new `apps/studio` Vite/CI build + DOM-env test project; root `tsconfig`
`include`; `apps/*` workspace glob. (All IaC: config-as-code, reviewed up front per ADR-006
Implementation Notes.)

**Documentation:** `apps/studio/README.md` (how to dev-run the SPA, the isolation rationale pointer
to ADR-006/007, the "fork-only, never sliced upstream" note).

**Dependencies:** ADR-006, ADR-007 (accepted). Does **not** require s1 to be merged to scaffold, but
the load phase (Phase 3) does.

**Definition of done:**

- [ ] `apps/studio` builds with `vite build` and dev-runs with `vite` (HMR reflects an edit < 1 s).
- [ ] `tsc --noEmit -p tsconfig.json --listFiles` names **zero** `apps/` files; backend typecheck green.
- [ ] No `packages/*/package.json` has a frontend dependency; boundary check passes.
- [ ] `pnpm lintAndFormat` and `pnpm spell-check` pass with the new `.tsx` + vocabulary.
- [ ] The DOM-env vitest project runs and the smoke test passes.

---

### Phase 2: App shell + routing (`spa-foundation/app-shell-and-routing`)

**Goal:** the app renders a left-hand notebook list and the active notebook top-to-bottom, routing
between notebooks — against an in-memory fixture project (no network yet).

**Deliverables:**

- `src/shell/App.tsx`, `NotebookList.tsx`, `NotebookView.tsx`.
- In-app notebook routing (selected `notebookId` in state, mirrored to `location.hash`).
- `NotebookView` maps `notebook.blocks` in array order to a placeholder `<BlockRenderer>` (the real
  renderers arrive in Phases 4–8; here it can render a labelled stub per block).
- A shared fixture typed `: ApiProject` (the ~20-block reference workload, full envelope) under `apps/studio/src/__fixtures__/`.

**Test strategy (TDD):**

- **Component test — list:** given a fixture project with N notebooks, `NotebookList` renders N
  entries; clicking one updates the active notebook and the hash.
- **Component test — order:** `NotebookView` renders blocks **top-to-bottom in `blocks[]` order**
  (asserts DOM order matches array order).
- **Routing test:** loading `#/notebook/<id>` selects that notebook; default selects
  `initNotebookId` (or the first).

**Infrastructure:** none beyond Phase 1.

**Documentation:** update `apps/studio/README.md` with the shell/routing model.

**Dependencies:** Phase 1.

**Definition of done:**

- [ ] Notebook list renders all notebooks; selection routes and updates the hash.
- [ ] Active notebook renders its blocks top-to-bottom in persisted order.
- [ ] All shell/routing component tests pass against the fixture.

---

### Phase 3: Project load over the s1 API into app state (`spa-foundation/project-load-state`)

**Goal:** the shell renders a **real** project fetched from the s1 server, with loading/error states.

**Deliverables:**

- `src/api/fetchProject.ts` (`GET /api/project`, returns the **full** `ApiProject` envelope imported
  from the Node-free `api-types` entry; typed `ProjectLoadError` on failure).
- `src/state/projectStore.ts` (the `loading | loaded | error` discriminated state, carrying
  `project: ApiProject['project']` + `capabilities`) wired into `App`.
- Loading and error UI (the error UI carries the actionable message the s1 API surfaces, e.g.
  "deepnote-toolkit not installed" — but rendering only; no run/retry execution here).

**Test strategy (TDD):**

- **Contract drift test — COMPILE-TIME against the imported s1 type (C1).** The drift-catch is a
  **type-level** assertion, **not** a runtime mock of a local shape: `fetchProject`'s return type is the
  imported `ApiProject`, and a `tsc`-checked assertion (e.g. `expectTypeOf<Awaited<ReturnType<typeof
fetchProject>>>().toEqualTypeOf<ApiProject>()`, plus the fixture typed `: ApiProject`) makes any s1
  contract change that the SPA hasn't absorbed a **compile error**. Because the SPA imports `ApiProject`
  rather than re-declaring it, drift cannot be silent — there is no second shape to drift _from_. A
  runtime test still asserts `fetchProject` returns the fixture on a 2xx and the typed error on non-2xx.
- **State test:** the store transitions `loading → loaded` on success and `loading → error` on
  failure; `App` renders the shell on `loaded`, a spinner on `loading`, the banner on `error`.
- **Type-only-import test:** an assertion (lint/grep or a `tsc` trace) that the only thing imported
  from `@deepnote/runtime-server` is types from the Node-free entry (R2).

**Infrastructure:** none beyond Phase 1 (the fetch hits the s1 server at runtime; no new build step).

**Documentation:** README note on the load path + the `api-types` import boundary.

**Dependencies:** Phase 2; **`m3/s1/serve-api/project-open-list-api`** (the `GET /api/project`
endpoint + the `api-types` entry must exist).

**Definition of done:**

- [ ] `App` fetches `GET /api/project`, loads it into state, and renders the shell from real data.
- [ ] Loading and error states render correctly (error shows the s1-surfaced message).
- [ ] The SPA imports **only** types from `@deepnote/runtime-server`'s Node-free entry; boundary
      check + type-only-import test pass.
- [ ] **R7 checkpoint (graded metric — split a):** **shell-to-render against an already-running
      server** (browser → rendered shell with the real project; blocks still placeholder until Phase 4+)
      is measured — this kernel-free path is the viewer's responsibility and is re-measured at Phase 8
      once renderers exist. The cold `deepnote serve`-to-render time (split b) is s1-gated and reported,
      not graded here.

---

### Phase 4: Code / markdown / text renderers (`block-renderers/code-markdown-text-renderers`)

**Goal:** code, markdown, and the seven text-cell kinds render correctly (code with syntax
highlighting + its persisted outputs via `OutputRenderer`).

**Deliverables:**

- `src/blocks/CodeRenderer.tsx` (syntax-highlighted source from `block.content` + `<OutputRenderer
outputs={block.outputs ?? []}>`), `MarkdownRenderer.tsx` (renders `markdown` block content as
  prose), `TextRenderer.tsx` (the seven `text-cell-*` kinds — reuse `createMarkdownForTextBlock`
  from `@deepnote/blocks` to derive markdown, then render).
- Registry entries wiring these types into `BlockRenderer`.

**Test strategy (TDD):**

- **Component test per renderer** against fixture blocks: code renders highlighted source and its
  persisted output; markdown renders formatted prose; each text-cell kind (p/h1/h2/h3/bullet/todo/
  callout) renders its correct structure.
- **Read-only assertion:** the rendered code block exposes **no** run control and **no** editable
  field (R8).

**Infrastructure:** none. **Documentation:** none beyond inline.

**Dependencies:** Phase 1–2 (shell + dispatcher); Phase 5 (`OutputRenderer`) for code's outputs —
sequence Phase 5 before/with Phase 4's output assertion, or stub outputs until Phase 5 lands.

**Definition of done:**

- [ ] code, markdown, and all seven text-cell kinds render from the fixture; component tests pass.
- [ ] Code blocks show persisted outputs (once Phase 5 lands) and expose no edit/run affordance.

---

### Phase 5: Jupyter `IOutput` MIME renderer (`block-renderers/ioutput-mime-renderer`)

**Goal:** the browser counterpart to `output-renderer.ts` — `IOutput[]` renders to the DOM via the
rendermime-style MIME dispatch. Shared by every output-bearing block renderer.

**Deliverables:**

- `src/outputs/OutputRenderer.tsx` (dispatch on `output_type`: `stream`/`display_data`+
  `execute_result`/`error`, mirroring `renderOutput`).
- `src/outputs/StreamRenderer.tsx`, `ErrorRenderer.tsx` (ANSI-aware traceback, stderr styling),
  `DataRenderer.tsx`.
- `src/outputs/mime/registry.ts` + per-MIME renderers: HTML (sanitized — dataframe tables), image
  (png/jpeg/svg, svg sanitized), `text/markdown`, `text/plain` (ANSI), with rich-first precedence.

**Test strategy (TDD):**

- **Per-output-type tests** against fixture `IOutput`s (the same fixtures shape `run` produces):
  `stream` (stdout/stderr) renders text with stderr styling; `error` renders ename/evalue + ANSI
  traceback; `display_data`/`execute_result` render via the registry (R4).
- **MIME precedence tests:** a bundle with both `text/html` and `text/plain` renders the **HTML**
  (rich-first), inverting the terminal renderer; a `text/plain`-only bundle renders text.
- **Sanitization test:** a malicious `text/html`/`image/svg+xml` fixture is sanitized (no script
  execution / no unsanitized injection).
- **Parity-of-shape test:** the dispatch covers exactly the four `output_type`s `renderOutput`
  handles, with no fifth path silently dropped.

**Infrastructure:** none. **Documentation:** a short note in README mapping this renderer to its
terminal counterpart (`output-renderer.ts`) and the rich-first precedence rationale.

**Dependencies:** Phase 1.

**Definition of done:**

- [ ] `stream`, `display_data`, `execute_result`, `error` all render in the DOM (R4).
- [ ] HTML tables, images, ANSI tracebacks render; HTML/SVG are sanitized.
- [ ] MIME precedence prefers the richest renderable bundle; `text/plain` is the last resort.
- [ ] All output component tests pass against fixtures.

---

### Phase 6: SQL renderer (`block-renderers/sql-renderer`)

**Goal:** SQL blocks render their query and their persisted result table.

**Deliverables:**

- `src/blocks/SqlRenderer.tsx` — renders `block.content` (the SQL, syntax-highlighted) and the
  persisted result via `<OutputRenderer outputs={block.outputs ?? []}>` (the result table is
  typically a persisted `text/html`/`text/plain` output, so it flows through the MIME registry).
- Registry entry for `sql`.

**Test strategy (TDD):**

- **Component test:** a fixture SQL block renders its query text and its persisted result table
  (HTML table via the MIME registry); a SQL block with no persisted output renders the query alone.
- **Read-only assertion:** no run control, no editable query (R8).

**Infrastructure:** none. **Documentation:** none beyond inline.

**Dependencies:** Phase 5 (`OutputRenderer`/MIME registry), Phase 1–2.

**Definition of done:**

- [ ] SQL blocks render query + persisted result table; tests pass against the fixture.

---

### Phase 7: Visualization / big-number / image renderers (`block-renderers/viz-bignumber-image-renderers`)

**Goal:** visualization, big-number, and image blocks render — the rich-visual surface where
Cloud-likeness lives.

**Deliverables:**

- `src/blocks/VisualizationRenderer.tsx` — **prefers the persisted output** through the MIME registry
  (persisted image, or native vega/plotly when the persisted bundle is a vega/plotly spec — Decision
  3/3a), **falling back to the authoring spec only when `outputs` is empty** (M1); does **not**
  re-execute the spec (R8).
- `src/blocks/BigNumberRenderer.tsx` — **prefers the persisted output tile; falls back to the
  `deepnote_big_number_title`/`_value` (+ optional comparison) metadata only when `outputs` is empty**
  (M1).
- `src/blocks/ImageRenderer.tsx` — renders the image (reuse `createMarkdownForImageBlock`/the
  `deepnote_img_src` metadata; src sanitized).
- Registry entries for `visualization`, `big-number`, `image`; optional `react-vega`/`react-plotly.js`
  registered into the MIME registry for the vega/plotly MIME types.

**Test strategy (TDD):**

- **Component tests:** a visualization block with a persisted image renders that image; a viz block
  with a persisted vega/plotly bundle renders natively (or, if native is deferred, falls back to the
  image — Decision 3a); a big-number block renders its value/title/comparison; an image block renders
  its `src`.
- **Read-only / no-execution assertion:** the visualization renderer never issues a run/kernel call
  (R8) — it is a pure function of persisted output.

**Infrastructure:** the optional `react-vega`/`react-plotly.js` deps land in `apps/studio/package.json`
only (R1). **Documentation:** README note on the persisted-first / native-upgrade viz decision.

**Dependencies:** Phase 5 (MIME registry), Phase 1–2.

**Definition of done:**

- [ ] visualization (persisted image and/or native vega/plotly), big-number, and image render from
      the fixture; component tests pass.
- [ ] No visualization renderer issues a kernel/run call; render is a pure function of persisted state.

---

### Phase 8: Input / button / separator renderers + unknown-type fallback (`block-renderers/input-button-separator-renderers` + `block-renderers/unknown-type-fallback`)

**Goal:** the remaining presentational block types render their persisted values read-only, and any
unknown type falls back safely — closing per-block-type coverage (R3, R5) and the time-to-first-render
bar (R7).

**Deliverables:**

- `src/blocks/inputs/` — eight read-only input renderers (text, textarea, checkbox, select, slider,
  date, date-range, file), each showing its **current persisted value** from
  `deepnote_variable_value` (no interactivity — read-only, R8): e.g. slider shows its value/position,
  select shows the chosen option(s), checkbox its checked state, date its date, file its filename.
- `src/blocks/ButtonRenderer.tsx` (renders the button label, disabled/non-firing — read-only),
  `SeparatorRenderer.tsx` (a horizontal rule — reuse `createMarkdownForSeparatorBlock`'s `<hr>`).
- `src/blocks/UnknownBlockRenderer.tsx` — the `default` dispatch branch: renders a labelled card with
  the block `type` and its raw `content` (R5), never throwing.

**Test strategy (TDD):**

- **Component test per input kind** against a fixture: each renders its current value read-only and
  exposes no interactive control that would mutate state (R8).
- **Button/separator tests:** button renders its label and does not fire on click; separator renders
  a rule.
- **Fallback test (R5):** a block with an unknown `type` (e.g. a synthetic `"future-block"` or an
  un-rendered `agent`/`notebook-function`) renders the labelled raw-content fallback and does **not**
  throw or blank the surrounding notebook view; a notebook mixing known and unknown blocks renders
  the known ones normally.
- **Coverage test (R3):** a fixture project containing **every** in-scope block type renders with no
  block falling through to an error — the full per-block-type matrix.
- **Time-to-first-render (R7), graded on split (a):** **shell-to-render against an already-running
  server** — browser → rendered ~20-block notebook — is the kernel-free metric this phase asserts is
  well inside budget. The cold `deepnote serve`-to-render (split b, server boot + interpreter) is
  reported but bounded by s1 boot, not graded here.

**Infrastructure:** none. **Documentation:** README note completing the block-type coverage matrix
and the unknown-type policy.

**Dependencies:** Phase 1–2; the fallback is independent but lands here to close the coverage matrix.

**Definition of done:**

- [ ] All eight input kinds, button, and separator render their persisted state read-only; tests pass.
- [ ] Unknown/unsupported types render the labelled fallback without crashing the view (R5).
- [ ] The full-coverage fixture renders every in-scope block type (R3).
- [ ] DOM `IOutput` coverage (stream/display_data/execute_result/error) verified end-to-end (R4).
- [ ] Time-to-first-render (R7): **shell-to-render against an already-running server** is well inside budget (graded — split a); cold `deepnote serve`-to-render reported, s1-gated (split b).

## Migration & Rollback

**Migration:** This is a **pure addition** to the fork dev branch. It introduces a new top-level
`apps/` tier and the `apps/studio` app; it changes exactly two files outside `apps/`: the root
`tsconfig.json` (`include`) and `pnpm-workspace.yaml` (`apps/*` glob) — both required by ADR-006/007
and both **process-diff-only** (they never ride the upstream contrib slice). No existing backend
behavior changes. The one ordering constraint: the root-`tsconfig` `include` must land **with** the
`apps/*` glob, or the backend's PR-gating typecheck globs `apps/studio/**/*.tsx` and fails on JSX
(ADR-006 §4).

**Fork-only boundary (load-bearing):** `apps/studio` is `"private": true` and **never** sliced into
the `contrib/*` upstream diff. The P7 slice is "everything under `packages/` for the milestone; never
name `apps/`" (ADR-007 §5). The viewer has **zero** backend coupling beyond the Node-free `api-types`
import, so removing it from the slice is a directory exclusion, not an untangle. A grep of the contrib
slice for `react|vite|apps/|\.tsx` must return nothing (ADR-006/007 Validation).

**Rollback:** clean. Deleting `apps/studio/`, the `apps/*` glob line, and reverting the root-`tsconfig`
`include` to keyless restores the prior state with no backend side effects (the backend never depended
on any of it). Each phase is independently revertible: dropping a renderer reverts its registry entry
and the dispatcher falls back to the unknown-type renderer for that type (R5) — the app keeps working
with reduced coverage.

## Risks

| Risk                                                                          | Impact                                            | Likelihood | Mitigation                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root-`tsconfig` `include` omitted/wrong, or lands after the `apps/*` glob     | Backend PR-gating typecheck reds on the SPA's JSX | Medium     | Phase 1 isolation test asserts `tsc --listFiles` names zero `apps/` files; the `include` lands **with** the glob (ADR-006 §4); CI gate                                                                                                                                                                           |
| SPA value-imports the server runtime (drags Node deps into the browser graph) | R2 violated; Node imports in the browser bundle   | Medium     | Import **only** the Node-free `api-types` entry (ADR-007 §6); `madge`/dependency-cruiser + type-only-import test in Phase 3                                                                                                                                                                                      |
| Unsanitized persisted `text/html`/SVG injection                               | DOM corruption / latent XSS in the showcase       | Medium     | Sanitize HTML/SVG before injection (Decision 2); sanitization test in Phase 5                                                                                                                                                                                                                                    |
| Native vega/plotly libs heavier than the showcase warrants                    | Bundle bloat / renderer churn                     | Low/Medium | Persisted-image fallback already satisfies R3 (Decision 3a); native path is a one-line registry add/remove                                                                                                                                                                                                       |
| `api-types` shape drifts from the s1 server contract                          | SPA renders wrong/empty; silent breakage          | Low        | **The viewer IMPORTS `ApiProject` rather than re-declaring it (C1)** — there is no second shape to drift from; the Phase 3 drift test is a **compile-time** type assertion against the imported s1 type, so any unabsorbed s1 change is a `tsc` error, not a silent runtime mismatch; `m3/s2` depends on `m3/s1` |
| Unknown-type renderer missed for `agent`/`notebook-function`                  | A real block type throws and blanks the notebook  | Low        | Dispatcher `default` branch **is** the fallback (Decision 6); full-coverage + mixed-block fixture tests (Phase 8, R5)                                                                                                                                                                                            |
| A renderer accidentally wires execution/editing                               | Violates P2 read-only scope (R8)                  | Low        | Per-renderer read-only assertions (Phases 4/6/7/8); no run endpoint/WS exists in this story                                                                                                                                                                                                                      |
| Time-to-first-render exceeds 10 s                                             | Fails R7 / `m3/s2` SC3                            | Low        | R7 is split (S2): the viewer is graded on **shell-to-render against an already-running server** — a kernel-free path, pure function of persisted state, well inside budget (measured Phase 3 shell + Phase 8 full); the cold `deepnote serve`-to-render is **s1-gated** (server boot), reported not graded here  |

## Roadmap Connection

This design serves story **`m3/s2`** ("Open & view a notebook locally") and makes its two projects'
features mechanical:

- **`m3/s2/spa-foundation`** → Phases 1–3, one per feature:
  `framework-bundler-setup` (P1) · `app-shell-and-routing` (P2) · `project-load-state` (P3).
- **`m3/s2/block-renderers`** → Phases 4–8, mapping to its six features:
  `code-markdown-text-renderers` (P4) · `ioutput-mime-renderer` (P5) · `sql-renderer` (P6) ·
  `viz-bignumber-image-renderers` (P7) · `input-button-separator-renderers` + `unknown-type-fallback`
  (P8). _(Sequencing note for the sprint-architect: the `ioutput-mime-renderer` feature is built
  before/with the output-bearing renderers — code/sql/viz — because they embed it; the roadmap lists
  it at sequence 5 but its work is a dependency of the sequence-1 code renderer's output path.)_

Depends on **`m3/s1`** (the wedge): specifically `m3/s1/serve-api/server-package-scaffold` (the
Node-free `api-types` entry exporting the canonical `ApiProject`, ADR-007 §6), `project-open-list-api`
(`GET /api/project`), and `m3/s1/cli-serve` (the `--static-dir` launch that serves the built SPA + the
API). The viewer is the first consumer of that API. **Static-dir data-flow (S1):** `--static-dir
apps/studio/dist` is supplied by the **fork's launch wrapper**, never defaulted in the sliced `serve.ts`
(ADR-007 §2 / s1 R1) — so the upstream contrib slice carries no `apps/` token and the SPA's built-assets
path stays a fork-only value the wrapper hands in at launch.

**Roadmap update:** set `docs_ref` on `m3/s2` to this design doc (the story now has an implementation
design; the projects keep their ADR/PRD refs).

## Open Questions

- **Exact `api-types` field names.** Owned by `m3/s1/serve-api`, which exports the canonical
  `ApiProject` (`{ path, metadata, project: DeepnoteFile['project'], openHash, capabilities }`). This
  doc **imports** that type and derives its view-models from `ApiProject['project']`, so there is no
  separate viewer shape to reconcile — any s1 field change surfaces as a compile error in the Phase 3
  drift test, not a silent runtime mismatch. No design change here; the viewer tracks s1 by construction.
- **Syntax-highlighting / markdown library choice.** A renderer-internal pick (e.g. a
  Shiki/Prism-class highlighter, a markdown renderer) scoped entirely to `apps/studio`. Left to the
  Phase 4/5 executor; it does not affect the architecture (registry-based, swappable) and lands only
  in `apps/studio/package.json` (R1).
- **Native vega/plotly vs. persisted image (final P2 call).** Resolved as Decision 3/3a: persisted-
  first through the MIME registry, native as an additive registry entry that can degrade to the image
  without failing the phase. Flagged here because PRD Open Questions assigned the final call to this
  design doc.

---

## Revision History

| Date       | Author  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-12 | muunkky | Initial design — read-only viewer SPA (PRD P2 / m3/s2); 8 phases mapping 1:1 to the `spa-foundation` + `block-renderers` roadmap features.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-06-12 | muunkky | Design-review pass (verdict: Request Changes — architecture approved; corrections only). **B1/C1:** DELETED the locally-redeclared `ProjectResponse`/`NotebookSummary` interfaces; the viewer now `import type { ApiProject } from '@deepnote/runtime-server/types'` (the s1-owned canonical contract), derives view-models from `ApiProject['project']`, `fetchProject(): Promise<ApiProject>`, and consumes the FULL envelope including `capabilities` (KD-6 "kernel missing" UI state); the Phase-3 drift test is now a COMPILE-TIME type assertion against the imported s1 type, not a runtime mock of a local shape. **S1:** annotated the data-flow that `--static-dir apps/studio/dist` is supplied by the fork's launch wrapper, never defaulted in the sliced `serve.ts` (ADR-007 §2 / s1 R1). **S2:** split R7's < 10 s into (a) shell-to-render against an already-running server (the viewer's kernel-free responsibility — graded) vs (b) cold `deepnote serve`-to-render (s1-boot-gated, reported); updated Phases 3/8 and the risk row. **M1:** big-number/viz precedence — "prefer persisted output; fall back to metadata when outputs empty." **M2:** widened the MIME renderer signature from `data: string \| string[]` to `data: unknown` to cover JSON-bundle MIME types (vega/plotly are objects, not strings). |
