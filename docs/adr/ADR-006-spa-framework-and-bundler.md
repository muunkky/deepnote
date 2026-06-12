# ADR-006: Adopt React + Vite as the SPA toolchain, in an isolated `apps/studio` package the backend never depends on

> **Status**: Accepted | **Date**: 2026-06-11 | **Deciders**: CAMERON

## Context

The m3 milestone (PRD-003) builds a local, browser-based UI for opening, editing, and
reactively running `.deepnote` projects. That UI is a single-page application (SPA) that
consumes the s1 backend's HTTP + WebSocket API. Before any SPA code can be written, the
monorepo needs something it has never had: a **UI framework** and a **browser bundler /
dev-server**.

This is not an incidental "`pnpm add` and move on" detail — it is a load-bearing decision the
PRD calls out explicitly (Technical Considerations, "Framework + bundler introduction is a real
cost"), gives its own P0 ADR slot, and ties to roadmap node `m3/s2/spa-foundation`
("Introduce a UI framework + browser bundler to the monorepo for the first time … a load-bearing,
one-way-ish decision … The toolchain must be isolated enough that it does not leak into — or
risk — the cleanly-sliceable backend package").

**The current state of the monorepo (verified against the code).**

- **Zero frontend exists.** `find packages -name '*.tsx' -o -name '*.jsx'` returns **0** files.
  No package's `package.json` declares a direct dependency on react, preact, svelte, solid-js,
  vite, `@vitejs/*`, esbuild, express, fastify, or hono. The only such names in the tree are
  transitive (and a set of security version-pins in root `pnpm.overrides`).
- **The toolchain is deliberately narrow and strict.** Root `package.json` shows the entire
  build/lint/test surface: **Biome 2.2.7** (TS/JS lint + format) + **Prettier 3.6.2** (md/yaml
  only) + **tsdown 0.15.9** (library bundler, used by every package's `build` script) +
  **vitest 4.1.8** (test runner) + **tsc 5.9.3** (`--noEmit` typecheck) + **cspell 9.2.2**.
  `biome.json` enables a notably strict ruleset, including an **`a11y` block** and
  `noExplicitAny: error` — rules that only begin to bite once `.tsx` exists. `tsconfig.json` is
  `strict: true`, `module: esnext`, `moduleResolution: bundler`, `lib: ["ES2022"]`, with **no
  `jsx` compiler option set** (it has never needed one) and `types: ["vitest"]`.
- **The toolchain is repo-wide by default, and that is the crux of the isolation problem.**
  There is exactly **one** `tsconfig.json` (the root) and it has **no `include` key** — only
  `"exclude": ["node_modules", "dist"]`. There is **no per-package `tsconfig.json` anywhere**. So
  `tsc --noEmit -p tsconfig.json` (the first half of the root `typecheck` script, and a
  PR-gating CI job) globs **every** `.ts`/`.tsx` file under the repo. Likewise the second half,
  `pnpm -r exec tsc --noEmit`, runs `tsc` in every workspace package; `build` is `pnpm -r run
build`; `biome.json` sets `includes: ["**"]`; and the cspell glob is `**/*.{md,txt,json,js,ts,
tsx,jsx,py,yml,yaml}`. Once an `apps/*` workspace glob is added (this decision's structural
  change), **all of these sweep `apps/` by default**. The toolchain provides **no** automatic
  isolation of an `apps/studio` tree — isolation must be **configured**, and this ADR specifies
  exactly how (Implementation Notes), because the default behavior is the opposite of isolated.
- **A Vite engine is already in the tree — for tests, not for the browser.** vitest is
  Vite-based; the root already devDepends on `vite-tsconfig-paths` and `vitest.config.ts`
  already runs a Vite plugin pipeline (`plugins: [tsconfigPaths()]`). Root `pnpm.overrides`
  already pins `vite: ">=7.3.2"` and `rollup: ">=4.59.0"`. So the repo is not Vite-naive; it has
  simply never pointed Vite at a browser entry/HMR dev-server.
- **The #162 boundary is the dominant architectural force.** PRD-003 partitions m3 into a
  **backend wedge** (`runtime-core` over HTTP/WS + a `deepnote serve` CLI command, in
  `packages/*`, the cleanly upstream-contributable piece offered on #162) and a **UI shell**
  (the SPA, fork-only showcase, overlapping `vscode-deepnote`'s assigned surface). The clean
  `contrib/*` diff (PRD Phase P7) must be sliceable code-only off `upstream/main` with **zero**
  frontend footprint. Any framework/bundler dependency that the backend package — or the repo
  root the backend's CI exercises — picks up would contaminate that slice. PRD risk row
  "Framework/bundler introduction destabilizes the monorepo" names exactly this: "isolate the
  SPA package so the backend slices clean of it; backend has **no** frontend dependency."
  Note carefully that there are **two distinct guarantees** here, which this ADR keeps separate:
  (a) the **`contrib/*` slice** carries no `apps/` at all, so it is provably frontend-free by
  construction; but (b) the **fork's development branch** carries `apps/studio` alongside the
  backend, where the repo-wide jobs above will sweep it unless explicitly configured not to. The
  isolation this ADR must deliver is therefore not "the SPA can't touch the backend" (the
  dependency edge already runs one way) but "a broken or JSX-bearing SPA does not red the
  backend's own typecheck/build/lint gate on the fork dev branch by default."

Three forces are therefore in tension:

1. **Ecosystem maturity for notebook-grade rich output** vs. **bundle size / footprint.** The
   SPA must render the full `.deepnote` block model — code, sql, markdown, eight input kinds,
   visualizations (vega/plotly), big-number tiles, images, separators — plus Jupyter `IOutput`
   MIME types (`stream`, `display_data`, `execute_result`, `error`), including HTML dataframe
   tables and rich media. This is precisely the territory where the Jupyter/notebook ecosystem
   has settled overwhelmingly on one framework, and where "we'll wire it ourselves" is real,
   recurring work.
2. **Developer experience for the live loop** (HMR fast enough that edit→run→see-output feels
   "Cloud-like," PRD's < 2 s bar) vs. **coexistence with the existing tsdown/vitest/Biome/cspell
   toolchain** (one more bundler is one more config, one more lockfile surface, one more set of
   lint rules to satisfy).
3. **Picking a stack that maximizes our ability to ship the SPA** vs. **picking one whose
   isolation is genuinely enforceable**, so the backend wedge that is the whole upstream point
   stays extractable.

This ADR decides the **framework** and the **bundler/dev-server**, and the **isolation
mechanism** that keeps them off the backend. It does **not** decide the browser↔kernel
transport (a separate P0 ADR), the package's internal component structure, or which
visualization library renders vega/plotly (a P2/P3 design-doc call).

## Decision

We will adopt **React 19 + TypeScript** as the SPA framework and **Vite 7 (with
`@vitejs/plugin-react`) as the browser bundler and dev-server**, housed in a **new, isolated
`apps/studio` package** that the backend packages and the repo root build never depend on.
(Package home and the dependency boundary are owned by **ADR-007**; this ADR uses the same
`apps/studio` / `@deepnote/studio` name ADR-007 fixes — see Cross-ADR reconciliation in the
revision history. ADR-006 decides the **framework**, the **bundler/dev-server**, and the
**toolchain-isolation mechanism**.)

Concretely:

1. **Framework: React 19, authored in `.tsx` with strict TypeScript.** The SPA renders the block
   model and `IOutput` MIME types through React components. React is chosen for the depth of the
   notebook/rich-output rendering ecosystem it unlocks (below), not for novelty.

2. **Bundler / dev-server: Vite 7 + `@vitejs/plugin-react`.** Vite serves the dev loop (browser
   HMR for the live edit→run loop) and produces the production SPA bundle. tsdown stays the
   bundler for every **library** package (`packages/*`); Vite is introduced **only** for the
   browser application. We **reuse the already-pinned Vite/rollup version line** in root
   `pnpm.overrides` (`vite: ">=7.3.2"`, `rollup: ">=4.59.0"`) so we govern one version line, not
   two — but note the **browser dev-server and the production rollup build are new code paths**
   we are introducing, merely held to that existing version pin (see Key Factor 2 / M1).

3. **Isolation via a new `apps/*` workspace root, not `packages/*`.** We add an `apps` glob to
   `pnpm-workspace.yaml` and place the SPA at `apps/studio`. The frontend toolchain
   (react, react-dom, vite, `@vitejs/plugin-react`, `@types/react*`) is declared **only** in
   `apps/studio/package.json`. **No `packages/*` `package.json` gains a frontend dependency**, and
   in particular the s1 backend/server package does not. The dependency edge points one way:
   `apps/studio` may depend on workspace types from `packages/*` — and specifically imports the
   server's **API request/response/event types from a Node-import-free entry** that ADR-007
   defines (an internal `api-types.ts` / a `@deepnote/runtime-server/types` subpath export with
   zero runtime imports), so resolving those types under the root `paths` mapping does **not**
   drag the server's Node HTTP/WS imports into the SPA's type graph. (The "types only" posture
   toward `@deepnote/blocks` and the server's API-types entry is a **convention**, not an absolute
   the toolchain enforces: under the root `paths` map, `@deepnote/*` resolves to a package's
   _source_ `index.ts`, so a value import is physically possible. Biome's `useImportType: error`
   _partially_ keeps it honest — it forces genuinely type-only imports to be written `import
type` — but it does not stop the SPA from importing a runtime value; the discipline is "import
   types, not runtime," backed by the Node-free entry ADR-007 provides for the server's API
   surface.) Nothing in `packages/*` may depend on `apps/studio`. This one-way edge is the
   property that keeps the `contrib/*` slice (PRD P7) frontend-free — but it is **not by itself**
   what keeps the fork dev branch's repo-wide gate green; that requires the toolchain-isolation
   config in §4.

4. **Toolchain isolation is configured with a concrete mechanism, not asserted.** The repo's
   typecheck/build/lint/spell jobs are repo-wide by default (Context), so adopting React/Vite is
   **not** isolated unless we make it so. The mechanism (full detail in Implementation Notes):
   - Add an explicit `"include"` to the **root** `tsconfig.json` —
     `"include": ["packages/*/src", "test-helpers", "*.config.ts"]` (or an equivalent that
     provably names no `apps/` path) — so that `tsc --noEmit -p tsconfig.json` compiles **zero**
     `apps/` files. This is a change to a file **outside `apps/studio`** (the root config), made
     once, and it is the load-bearing fix: without it the root `tsc` job globs `apps/studio/**/*.tsx`
     and fails on JSX the moment the `apps/*` glob exists.
   - Give `apps/studio` its **own `tsconfig.json`** with `jsx: "react-jsx"` that the root config
     **never references** (no `references`, not on the root `include` list). The SPA typechecks
     under its own config; the backend's root `tsc` never sees JSX.
   - Scope Biome (`a11y`/`noExplicitAny` on `.tsx`), cspell terms, and the per-`apps/studio` Vite/CI
     steps the same way — enumerated in Implementation Notes so the full blast radius is reviewable
     up front and **none of it lands on the backend slice**.

The backend wedge (s1) is built **first** and must build, test, lint, typecheck, and slice with
**zero** reference to anything in this decision.

## Rationale

The recommendation falls out of weighting the three tensions in Context against the PRD's
explicit priorities: the SPA is a **fork-only showcase whose job is to make the open backend
look capable**, the backend slice's cleanliness is **non-negotiable**, and rich-output fidelity
is "where Cloud-likeness lives" (PRD Technical Considerations).

### Key Factors

1. **Rich-output rendering ecosystem maturity dominates the framework choice.** The single
   largest, riskiest surface in the SPA is faithfully rendering notebook output — Jupyter
   `IOutput` MIME bundles, HTML dataframe tables, vega/plotly visualizations, images, ANSI/error
   tracebacks. This is a solved problem in the React ecosystem specifically: JupyterLab and
   nbviewer-class renderers, the `@nteract` lineage, `react-vega`/`react-plotly.js`,
   `@jupyterlab/rendermime`-style MIME dispatch, and mature syntax-highlighting/markdown stacks
   all assume React or have first-class React bindings. Choosing Preact, Svelte, or Solid means
   re-implementing or hand-porting that MIME→renderer plumbing — net-new work the PRD already
   flags as the SPA's "real surface area." For a showcase whose value is _breadth of block-type
   coverage rendered convincingly_, ecosystem leverage beats raw runtime efficiency. React's
   well-known costs (larger runtime than Preact/Svelte/Solid; reconciler overhead) are
   **acceptable here** because NG1 caps us at "recognizable & productive," this is a localhost
   app with no cold-start-over-network or SEO budget to defend, and the < 2 s / < 10 s success
   bars are kernel-and-transport-bound, not framework-render-bound (the latency is in Python
   execution and the WS hop, not in React's diff).

2. **Vite is the lowest-marginal-cost bundler because the repo already version-governs it.**
   vitest is Vite-under-the-hood; `vite-tsconfig-paths` is already a root devDependency; `vite`
   and `rollup` are already pinned in `pnpm.overrides`. The honest framing is narrow: we are
   **reusing the already-pinned Vite/rollup version line**, not reusing a browser build that
   already exists — the **browser dev-server (HMR) and the production rollup build paths are
   genuinely NEW**, introduced by this decision and merely governed by that one existing pin. The
   value is real but bounded: one new config (`vite.config.ts` in `apps/studio`), one plugin
   (`@vitejs/plugin-react`), sharing the `tsconfigPaths` resolution model the repo already uses,
   with no second version line to track. Vite's browser HMR is the purpose-built answer to the
   PRD's live-loop DX requirement. The alternative bundlers are narrower-fit (Alternative 3), not
   incapable.

3. **`apps/*` makes the slice clean — but slice-cleanliness and fork-dev-CI isolation are two
   different things, and only the first is automatic.** The PRD's hardest constraint is that the
   backend wedge slices clean. Putting the SPA in a sibling workspace root (`apps/studio`) rather
   than `packages/studio` makes the **slice** obvious and mechanically clean: the frontend deps
   live in exactly one `package.json`, and the `contrib/*` slice (which checks out only backend
   code paths off `upstream/main`) never names `apps/`, so it carries no frontend footprint —
   genuinely decoupled, because the dependency edge is genuinely one-way (nothing in `packages/*`
   imports `apps/*`). **What is _not_ automatic** is the fork's own development branch: there,
   `apps/studio` sits in the tree alongside the backend, and the repo-wide build/typecheck/lint/
   spell jobs (Context) sweep it. So a broken or JSX-bearing SPA **reds the same gating CI the
   backend uses on the fork dev branch** unless the toolchain-isolation config in Decision §4 is
   in place. We state this plainly rather than imply near-total isolation: the **slice is
   decoupled; the fork dev CI gates the SPA and backend together** (acceptable — see Negative
   Consequences — and exactly why §4's root-`tsconfig` `include` is load-bearing). A
   framework/bundler we could not cleanly fence into `apps/studio` _and_ exclude from the root
   `tsc`/build globs would be the wrong choice no matter its runtime characteristics; isolation
   is a first-class selection criterion here.

We are explicitly trading **bundle size and raw runtime efficiency** (where Preact/Svelte/Solid
win) for **ecosystem maturity and rendering leverage** (where React wins), because the SPA's
constraints make footprint cheap and rich-output breadth expensive. We are trading **"one fewer
bundler in the repo"** for **a purpose-built browser dev-server**, mitigated by the fact that the
Vite/rollup version line is already governed for tests — though the browser build and HMR paths
themselves are new (M1).

## Consequences

### Positive

- **Maximum reuse of existing rich-output renderers.** The DOM `IOutput` renderer and per-block
  renderers (the SPA's largest scope) can lean on mature React libraries instead of bespoke MIME
  plumbing, materially de-risking the m3/s2 `block-renderers` work.
- **A genuinely fast live loop.** Vite browser HMR gives sub-second edit-to-reflect in the SPA
  shell, which is what makes the PRD's interactive loop feel "Cloud-like" during development.
- **The backend _slice_ stays pristine.** With all frontend deps confined to `apps/studio`, the
  `contrib/*` diff (PRD P7) is provably frontend-free — it never names `apps/`, so the upstream
  wedge is unaffected by this decision, which is the whole point of building backend-first. _(This
  is the slice guarantee; it is distinct from the fork-dev-CI behavior in the first Negative
  item below.)_
- **One Vite/rollup version line, not two.** Holding the new browser build to the already-pinned
  `pnpm.overrides` version means we govern a single version line — though the browser build and
  HMR code paths are themselves new (M1), so this is "one version to track," not "no new build."
- **Hiring/contribution familiarity.** React + Vite + TypeScript is the most widely understood
  SPA stack; a future contributor (or a maintainer evaluating the showcase) needs no exotic
  knowledge to read it.

### Negative

- **Toolchain isolation requires a real config change to a file _outside_ `apps/studio`, and the
  fork dev CI gates the SPA with the backend.** The repo-wide default means adopting JSX is not
  free: the **root** `tsconfig.json` must gain an explicit `"include"` (Decision §4 /
  Implementation Notes) so `tsc --noEmit -p tsconfig.json` stops globbing `apps/studio/**/*.tsx`
  and failing on JSX; `apps/studio` gets its own `jsx: "react-jsx"` tsconfig the root never
  references; Biome's `a11y`/`noExplicitAny` now fire on `.tsx`; cspell gains React/Vite
  vocabulary. Two honesties here: **(1)** the root-`tsconfig` `include` edit is a one-line change
  to a config **outside** `apps/studio` (the backend's own typecheck config) — small, but real,
  and it must land on the fork dev branch _before_ the `apps/*` glob, or the backend's typecheck
  job goes red. **(2)** Even with that fix, on the **fork development branch** the repo-wide
  build/typecheck/lint/spell jobs still run over `apps/studio`, so a broken SPA reds the **same
  gating CI the backend uses** there. This is **not** true of the `contrib/*` slice, which carries
  no `apps/` at all. _Acceptable_ because the cost is bounded and reviewable up front, the slice
  stays clean regardless, and co-gating the SPA on the fork dev branch is desirable (it catches
  SPA breakage early) — but we stop short of claiming the SPA is isolated from the backend's CI
  on the dev branch, because it is not.
- **React ships more bytes than the lighter alternatives.** For a localhost showcase with no
  network-cold-start or SEO budget, this is the cheapest tradeoff available — but it is a real
  cost we are choosing to pay for ecosystem leverage, and it would need re-examination if the SPA
  ever had to ship over a network to many users (out of scope per NG3/NG4).
- **Two bundlers now live in the repo** (tsdown for libraries, Vite for the app). Contributors
  must know which applies where. Mitigated by the clean `packages/*` (tsdown) vs `apps/*` (Vite)
  split, but it is one more thing to know.
- **A second test-execution context may appear.** Component tests for `.tsx` want a DOM
  environment (jsdom/happy-dom) and React Testing Library, distinct from the existing node-env
  vitest setup. This is deferrable (P2+) but foreseeable, and is additional config scoped to
  `apps/studio`.

### Neutral

- **`apps/*` becomes a permanent workspace concept.** Adding the glob is a small structural
  change that future application-shaped work (not libraries) would also use; neither clearly good
  nor bad, just a new convention to honor. (The glob and `apps/studio` home are ADR-007's
  decision; this ADR consumes them.)
- **Vite version is now governed by both the test path and the app path.** A vitest/Vite major
  bump and an `apps/studio` Vite bump are coupled through the shared `pnpm.overrides` pin — which
  keeps them consistent, but means one cannot move without considering the other.

## Alternatives Considered

### Alternative 1: Preact + Vite

**Description**: Same Vite/`apps/studio` isolation, but Preact (3 KB-class runtime,
React-compatible API) instead of React, using `preact/compat` to borrow parts of the React
ecosystem.

**Pros**:

- Dramatically smaller runtime — the strongest "bundle size" answer.
- Vite has first-class Preact support; the isolation story is identical to the recommendation.
- API familiarity (close to React) keeps the code readable.

**Cons**:

- The rich-output ecosystem leverage is the whole reason to pick a framework here, and Preact
  gets it only through `preact/compat`, which is a compatibility shim, not the real thing —
  notebook-grade renderers (`@jupyterlab/*`-adjacent, `react-vega`, `react-plotly.js`,
  rendermime-style MIME dispatch) routinely hit `compat` edge cases (refs, context, concurrent
  features, third-party deep imports). Debugging shim mismatches is exactly the kind of net-new,
  hard-to-estimate work the PRD warns about.
- The bundle-size win is nearly worthless in this context: a localhost showcase has no
  cold-start-over-network budget to protect.

**Why not chosen**: It optimizes the one axis (footprint) that barely matters for a localhost
showcase while taxing the one axis (rich-output ecosystem fidelity) that matters most. The
tradeoff is backwards for our constraints.

### Alternative 2: Svelte (or SolidJS) + Vite

**Description**: A reactive, compile-time framework (Svelte 5 / SvelteKit's Vite plugin, or
Solid) instead of React. Same `apps/studio` isolation.

**Pros**:

- Excellent runtime performance and small bundles; Svelte's compile-away model and Solid's fine-
  grained reactivity are genuinely elegant, and Vite is their native bundler.
- Svelte's reactivity model is conceptually adjacent to the notebook's own reactive-DAG mental
  model — there is a real aesthetic case for it.
- Strong, modern DX.

**Cons**:

- The notebook rich-output ecosystem is overwhelmingly React-shaped. For Svelte/Solid we would
  port or re-author the `IOutput` MIME renderers, vega/plotly bindings, and dataframe-HTML
  rendering — re-doing the exact surface the PRD identifies as the SPA's largest scope.
- Smaller pools of off-the-shelf notebook components and of contributors fluent in the stack,
  which matters more for a showcase meant to be _read_ by maintainers than for a product.
- Performance/bundle wins are, again, low-value on localhost.

**Why not chosen**: Same shape as Alternative 1 — it wins on axes (perf, bundle, elegance) that
are cheap here and loses on the axis (rendering-ecosystem reuse) that is expensive here. The
re-implementation cost on the SPA's biggest surface is the decider.

### Alternative 3: React with a non-Vite bundler (raw esbuild, or Rsbuild/Rspack/Webpack)

**Description**: Keep React, but bundle the browser app with esbuild directly, or with a
Rspack-family toolchain (Rsbuild/Rspack) or Webpack, instead of Vite.

**Pros**:

- esbuild is extremely fast and already transitively present; Rspack/Webpack are
  battle-tested for large apps, and **Rsbuild ships a batteries-included dev-server with HMR**
  (so the live-loop DX is not a Vite-exclusive property).
- Avoids introducing a "second" bundler family if one squints (esbuild underlies much tooling).

**Cons**:

- The decisive issue is **version governance, not capability**: the repo **already pins
  `vite`/`rollup` in `pnpm.overrides`** and **already runs Vite via vitest** (which is Vite-based),
  so adopting Vite adds **no new version line** and reuses the `tsconfigPaths` resolution model
  already in `vitest.config.ts`. A Rspack/Webpack family would introduce a **new toolchain and a
  new version surface** the repo does not govern today, for no rich-output benefit. _Raw_ esbuild
  is the weakest of these for our use — you assemble the browser dev-server/HMR yourself — but
  Rsbuild specifically does have HMR; we do not reject it for lacking a dev-server (it has one), we
  reject it for not being the engine the repo already version-governs.
- More config to own and keep consistent with the existing `tsconfigPaths` resolution.

**Why not chosen**: Vite reuses an engine and a version pin the repo **already governs** (via
vitest and `pnpm.overrides`), delivering the live-loop HMR the PRD needs with no new version
surface; the alternatives are capable (Rsbuild has HMR) but add a toolchain the repo does not
already version-govern, without a compensating benefit for a localhost SPA.

### Alternative 4: No framework — vanilla TS + Web Components, no new bundler

**Description**: Build the SPA in vanilla TypeScript / Web Components, bundled with the existing
tsdown, introducing no UI framework and no new browser bundler at all — the minimal-footprint,
status-quo-preserving option.

**Pros**:

- Zero new framework dependency; the smallest possible toolchain delta and the cleanest isolation
  story (nothing new to fence off).
- tsdown already exists; arguably no new bundler.

**Cons**:

- Forfeits the entire rich-output ecosystem — every `IOutput` renderer, every visualization
  binding, every dataframe-table renderer is hand-built. For a UI whose explicit value is
  _breadth of block-type coverage rendered convincingly_, this is the most expensive path, not
  the cheapest.
- tsdown is a library bundler; it has no browser dev-server/HMR, so the live loop DX the PRD
  wants would be absent or hand-rolled.
- State management for a reactive, multi-block, live-streaming UI in vanilla TS is exactly the
  wheel frameworks exist to avoid reinventing.

**Why not chosen**: It minimizes the cheap axis (toolchain footprint) at catastrophic cost to the
expensive axis (rich-output rendering and live-loop DX). The PRD's own framing — "block-type
coverage is the SPA's real surface area" — is the argument against it.

## Implementation Notes

This decision lands as a bounded, enumerated set of changes. The blast radius is listed in full
so reviewers can confirm **none of it touches the backend slice**.

**New package (all frontend deps live here, nowhere else):**

- `apps/studio/` — `package.json` declaring `react`, `react-dom`, `vite`, `@vitejs/plugin-react`,
  `@types/react`, `@types/react-dom` (and, when component tests arrive, `@testing-library/react`
  - a DOM env). Its **own** `vite.config.ts`, its **own** `tsconfig.json` with
    `jsx: "react-jsx"`, `index.html`, and `src/` entry. The package home, name (`@deepnote/studio`,
    `private: true`), and the workspace glob are **ADR-007's** decision; this ADR populates the
    frontend toolchain inside it.

**Workspace wiring:**

- `pnpm-workspace.yaml` — add an `apps/*` glob alongside `packages/*` (ADR-007).
- A documented (ideally lint-enforced) rule: `packages/* ↛ apps/studio`. The edge is one-way;
  `apps/studio` may consume `@deepnote/*` types (and the server's **Node-free** API-types entry
  from ADR-007), never the reverse.

**Root toolchain changes — the concrete isolation mechanism (this is the "real cost," and it is
load-bearing because the toolchain is repo-wide by default):**

- **`tsconfig.json` (root) — add an explicit `"include"`.** Today the single root `tsconfig.json`
  has **no `include` key** (only `"exclude": ["node_modules", "dist"]`), so
  `tsc --noEmit -p tsconfig.json` globs **every** `.ts`/`.tsx` under the repo — and would compile
  `apps/studio/**/*.tsx` and **fail on JSX** the moment the `apps/*` glob exists. The fix is to add
  `"include": ["packages/*/src", "test-helpers", "*.config.ts"]` (or an equivalent that provably
  names **no** `apps/` path). This is a change to a file **outside `apps/studio`** — the backend's
  own typecheck config — and it must land **before/with** the `apps/*` glob, or the backend's
  PR-gating typecheck job goes red. **Verification:** after the change, `tsc -p tsconfig.json
--listFiles` (or `--showConfig`) shows **zero** files under `apps/`. _(This config tweak rides
  the **process diff**, not the contrib slice: the slice has no `apps/` and so needs no
  `apps/`-excluding `include`; but the fork dev branch needs it. If the chosen `include` form
  happens to be backend-only and harmless upstream, it may also ride the slice — but it is not
  required there.)_
- **`apps/studio/tsconfig.json` — its own config the root never references.** It sets
  `jsx: "react-jsx"` and is **not** listed in the root `include` and **not** wired via
  `references`. The SPA typechecks under its own config (its own `pnpm -r exec tsc --noEmit` pass,
  or a dedicated `vite`/`tsc` step); the backend's root `tsc` never sees JSX.
- `biome.json` — Biome's already-enabled `a11y` block and `noExplicitAny: error` now apply to
  real `.tsx` (recall `includes: ["**"]` sweeps `apps/` too). Expect to satisfy a11y rules in
  components from day one (desirable, not a workaround). The existing `packages/cli` override block
  shows how to scope rules per-path if `apps/studio` needs any app-specific relaxation.
- `vitest.config.ts` — the node-env unit suite is unchanged. A DOM-env component-test project for
  `apps/studio` is **deferred** to when `.tsx` tests first appear (P2+), and will be scoped to
  `apps/studio` (a project entry or a separate config), not bolted onto the backend's test path.
- `cspell.json` / `docs-dictionary.txt` — add React/Vite/JSX terms as they appear (the cspell glob
  `**/*.{...,tsx,jsx,...}` already covers `apps/studio`).
- CI — `apps/studio` build + (later) component-test steps. Be explicit that on the **fork dev
  branch** the repo-wide `build`/`typecheck`/`lint-and-format`/`spell-check` jobs sweep
  `apps/studio` (that is the co-gating called out in Consequences); the `apps/`-excluding root
  `include` above is what keeps the **typecheck** job green despite JSX. The **contrib slice** has
  no `apps/` and so none of these touch it.

**Bundler boundary:** tsdown remains the bundler for every `packages/*` library (unchanged). Vite
is introduced **only** for `apps/studio`. The two never share a config.

**Sequencing:** This ADR gates `m3/s2/spa-foundation`. The s1 backend wedge is built and slice-
verified frontend-free **before** `apps/studio` is scaffolded; the root-`tsconfig` `include` is
added together with the `apps/*` glob so the backend's typecheck never regresses.

## Validation

We will know this was the right call if:

- **The backend slice is provably frontend-free.** When the `contrib/*` diff is cut (PRD P7), it
  contains **zero** of: `apps/`, `react`, `react-dom`, `vite`, `@vitejs/*`, `.tsx`. A grep of the
  contrib diff for those tokens returns nothing. _(This is the single most important signal — it
  is the reason the framework/bundler choice was constrained by isolation in the first place.)_
- **The fork dev branch's backend typecheck stays green despite JSX.** With the root-`tsconfig`
  `"include"` in place (Decision §4), `tsc --noEmit -p tsconfig.json --listFiles` on the fork dev
  branch (which **does** contain `apps/studio`) names **zero** files under `apps/`, so the
  backend's PR-gating typecheck job passes even while `apps/studio/**/*.tsx` exists in the tree.
  Conversely, the `apps/studio` typecheck (its own config) and the repo-wide
  build/lint/spell jobs **do** sweep `apps/studio` on the dev branch — i.e. a broken SPA reds the
  shared gate there, by design (the co-gating in Consequences). _This is the explicit signal that
  slice-isolation and fork-dev-CI isolation are different and only the first is total._
- **The one-way dependency rule holds.** No `packages/*/package.json` ever gains a frontend
  dependency; no `packages/*` source imports from `apps/studio`. Assertable in CI/review.
- **The live loop DX target is met.** Vite browser HMR reflects a component edit in the SPA shell
  in well under a second on a developer laptop, so the interactive-loop work (P3) is bottlenecked
  by kernel/transport latency (the PRD's < 2 s bar), not by the frontend toolchain.
- **Rich-output breadth lands without bespoke MIME plumbing.** The `block-renderers` work
  (m3/s2) renders the full block set + `IOutput` MIME types primarily by composing existing React
  renderers rather than hand-authoring MIME dispatch — i.e. the ecosystem-leverage premise pays
  off in reduced renderer LOC.

**Signals to revisit this decision:**

- If frontend deps are found leaking into `packages/*` or the backend slice (isolation has
  failed — the choice was predicated on it being enforceable).
- If the SPA's bundle/runtime ever has to ship over a network to many users (NG3/NG4 reversed) —
  the footprint tradeoff that is cheap on localhost would then deserve re-examination
  (Preact/Svelte back on the table).
- If `@vitejs/plugin-react` and the vitest-pinned Vite major diverge in a way that makes the
  shared `pnpm.overrides` pin untenable.

## Related Decisions

- **PRD-003** (`docs/prds/PRD-003-local-deepnote-ui.md`) — the m3 master PRD; this ADR resolves
  its P0 "UI framework + bundler" decision and is gated by roadmap node `m3/s2/spa-foundation`.
- **Forthcoming P0 sibling ADR — browser↔kernel transport** (proxy vs. direct vs. WASM) — a
  separate decision that this ADR does not pre-empt; together they form PRD-003's Phase P0.
- **ADR-007 — server/SPA package layout for the #162 slice** — owns the `apps/studio` /
  `@deepnote/studio` package home, the `apps/*` glob, and the Node-free API-types entry this ADR's
  SPA imports. ADR-006 was reconciled to ADR-007's `apps/studio` name (this ADR originally said
  `apps/web`); the toolchain-isolation mechanism here is the frontend half of that layout.
- **ADR-001 through ADR-004** (`docs/adr/`) — interpreter resolution and kernel/degradation
  behavior the `deepnote serve` backend reuses; unaffected by the frontend choice (and that
  independence is the point).

## References

- React — <https://react.dev/>
- Vite — <https://vite.dev/>
- `@vitejs/plugin-react` — <https://github.com/vitejs/vite-plugin-react>
- Preact / `preact/compat` (Alternative 1) — <https://preactjs.com/guide/v10/switching-to-preact/>
- Svelte (Alternative 2) — <https://svelte.dev/> ; SolidJS — <https://www.solidjs.com/>
- Jupyter `IOutput` / rendermime MIME model the DOM renderer mirrors —
  <https://jupyterlab.readthedocs.io/en/stable/extension/extension_points.html#mime-renderers>
- pnpm workspaces (`apps/*` glob) — <https://pnpm.io/workspaces>
- Upstream epic #162 — <https://github.com/deepnote/deepnote/issues/162> (the boundary that makes
  backend-slice isolation non-negotiable)

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-11 | Proposed | Initial proposal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-06-12 | Proposed | Adversarial-review pass (paired with ADR-007). **Cross-ADR 1:** renamed `apps/web`/`@deepnote/web` → **`apps/studio`/`@deepnote/studio`** everywhere to match ADR-007 (canonical). **Cross-ADR 2 (B1/B2):** replaced the "root tsc stays JSX-free / own tsconfig" hand-wave with the real mechanism — root `tsconfig.json` has no `include`, so `tsc -p tsconfig.json` globs `apps/studio/**/*.tsx` and fails on JSX; fix is an explicit root `"include"` (a file _outside_ `apps/studio`) + `apps/studio`'s own `jsx:"react-jsx"` config; added the SLICE-vs-FORK-DEV-CI honesty (slice is decoupled; fork dev CI co-gates SPA+backend). **Cross-ADR 3:** §3 now imports server API types from ADR-007's Node-free entry. **S2 (Alt 3):** narrowed rejection to version-governance (Rsbuild has HMR; not rejected for lacking a dev-server). **M1:** reframed "Vite already present" → reuse the already-pinned Vite/rollup _version line_; browser dev-server + production rollup build are new paths. |
