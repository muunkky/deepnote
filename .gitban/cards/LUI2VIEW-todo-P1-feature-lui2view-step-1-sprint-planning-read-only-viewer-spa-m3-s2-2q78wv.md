# LUI2VIEW Sprint Planning — read-only viewer SPA (m3/s2)

> **Sprint**: LUI2VIEW | **Type**: feature (planning) | **Step**: 1 (first)
>
> Plans the read-only viewer SPA (`apps/studio`) — PRD-003 Phase P2, roadmap story `m3/s2`
> "Open & view a notebook locally." End state: all sprint cards exist and are in `todo`. Fork-only showcase.

## Sprint Definition & Scope

**Sprint goal (one sentence):** Build the first-ever frontend in the monorepo — a read-only React 19 + Vite 7 viewer at `apps/studio` that loads a `.deepnote` project over the s1 `GET /api/project` and renders every block type plus persisted Jupyter `IOutput`s top-to-bottom, a pure function of persisted state with no execution and no editing.

**Primary input:** `docs/designs/m3-s2-viewer.md` (adversarially reviewed + revised; 8 phases mapping ~1:1 to the s2 roadmap features). ADRs: `docs/adr/ADR-006-spa-framework-and-bundler.md` (React+Vite, `apps/studio`, toolchain isolation), `docs/adr/ADR-007-server-spa-package-layout.md` (`apps/studio` layout + Node-free `api-types`). s1 contract: `docs/designs/m3-s1-server-api-and-serve.md` (the `ApiProject` type s2 imports).

**In scope:** `apps/studio` scaffold + root-`tsconfig` isolation; app shell + hash routing; project load over `GET /api/project`; the `IOutput` MIME renderer; per-block-type renderers (code/markdown/text, sql, viz/big-number/image, 8 inputs/button/separator); the unknown-type fallback.

**Out of scope (do NOT pull in):** execution (run controls, WebSocket, kernel calls), editing/save, the s1 server itself (a dependency, built in LUI1WEDGE), `react-router` (hash routing instead), a heavy state library (React built-ins or one tiny store).

**CRITICAL DEPENDENCY — s2 depends on s1 (LUI1WEDGE) and dispatches AFTER it.** The viewer is the first consumer of the s1 `GET /api/project` API and imports `ApiProject` from `@deepnote/runtime-server/types`. `packages/runtime-server` does NOT exist yet (verified). Step 4 (project-load-state) cannot complete until s1's `server-package-scaffold` (the Node-free `api-types` entry exporting `ApiProject`) and `project-open-list-api` (`GET /api/project`) are merged. Steps 2, 3, 5, 6A-6D, 7 can scaffold/build against in-memory fixtures without s1.

**FORK-ONLY boundary (load-bearing):** `apps/studio` is `"private": true`, never sliced into the upstream `contrib/*` diff, zero backend runtime coupling beyond the type-only `api-types` import. The two files outside `apps/` it changes (root `tsconfig.json` `include`, `pnpm-workspace.yaml` `apps/*` glob) ride the process diff only. A grep of the contrib slice for `react|vite|apps/|\.tsx` must return nothing.

* **Sprint Name/Tag**: LUI2VIEW
* **Roadmap Link**: `m3/s2` ("Open & view a notebook locally") — projects `spa-foundation` + `block-renderers`
* **Definition of Done**: all 12 sprint cards created and in `todo`; sequencing + dependencies recorded; closeout card ID recorded below.

**Required Checks:**
* [x] Sprint name/tag is chosen and will be used as prefix for all cards
* [x] Sprint goal clearly articulates the value/outcome
* [x] Roadmap milestone is identified and linked

## Card Planning & Brainstorming

**Source-of-truth corrections discovered during planning (bake into executor reading):**
- The blocks markdown helper is `createMarkdown(block)` + `stripMarkdown(block)` in `packages/blocks/src/markdown.ts` — a unified function keyed on `block.type`, NOT the per-type `createMarkdownForTextBlock`/`createMarkdownForImageBlock`/`createMarkdownForSeparatorBlock` names the design doc anticipated. Renderers reuse `createMarkdown(block)` rather than re-deriving markdown.
- Per-type guards exist in `packages/blocks/src/blocks/` (`isCodeBlock`, `isImageBlock`, `isInputTextBlock`, `isBigNumberBlock`, `isVisualizationBlock`, etc.) — use them to narrow.
- `IOutput`/`IStream`/`IError`/`IDisplayData`/`IExecuteResult` are re-exported (type-only) from `@deepnote/runtime-core` (`packages/runtime-core/src/index.ts`).
- `renderOutput(output: IOutput)` in `packages/cli/src/output-renderer.ts` is the terminal reference the DOM `OutputRenderer` mirrors (dispatch on `output.output_type`; the terminal prefers `text/plain` — the DOM renderer INVERTS to rich-first).

**Card inventory (12 cards):**

| Step | Card | Type | Roadmap feature |
| :--- | :--- | :--- | :--- |
| 1 | Sprint Planning (this card) | feature-sprint | story `m3/s2` |
| 2 | framework-bundler-setup | feature-ui | `spa-foundation/framework-bundler-setup` |
| 3 | app-shell-and-routing | feature-ui | `spa-foundation/app-shell-and-routing` |
| 4 | project-load-state | feature-ui | `spa-foundation/project-load-state` |
| 5 | ioutput-mime-renderer | feature-ui | `block-renderers/ioutput-mime-renderer` |
| 6A | code-markdown-text-renderers | feature-ui | `block-renderers/code-markdown-text-renderers` |
| 6B | sql-renderer | feature-ui | `block-renderers/sql-renderer` |
| 6C | viz-bignumber-image-renderers | feature-ui | `block-renderers/viz-bignumber-image-renderers` |
| 6D | input-button-separator-renderers | feature-ui | `block-renderers/input-button-separator-renderers` |
| 7 | unknown-type-fallback | feature-ui | `block-renderers/unknown-type-fallback` |
| 8 | Sprint Closeout | chore | story `m3/s2` (mandatory final) |

**Card IDs (filled in after creation):**
- Step 1 Sprint Planning (this card): `2q78wv`
- Step 2 framework-bundler-setup: `o572iu`
- Step 3 app-shell-and-routing: `rpbqkx`
- Step 4 project-load-state: `5p79t0`
- Step 5 ioutput-mime-renderer: `hch3tp`
- Step 6A code-markdown-text-renderers: `em1cwd`
- Step 6B sql-renderer: `nu6frj`
- Step 6C viz-bignumber-image-renderers: `5hy4pf`
- Step 6D input-button-separator-renderers: `hne4ie`
- Step 7 unknown-type-fallback: `yozjsd`
- **Step 8 Sprint Closeout (closeout card ID): `zuyt1y`**

### Card Types Needed

* [x] **Features**: 10 (9 feature-ui work cards + 1 feature-sprint planning card)
* [x] **Bugs**: 0
* [x] **Chores**: 1 (the mandatory sprint closeout card)
* [x] **Spikes**: 0
* [x] **Docs**: 0 (READMEs ride inside the feature cards)

## Sequential Card Creation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Sprint Planning (this card)** | step 1 — defines goal, inventory, sequencing | - [x] Planning card created with sprint tag |
| **2. framework-bundler-setup** | step 2 — scaffold + root-`tsconfig` isolation | - [x] Scaffold card created |
| **3. app-shell-and-routing** | step 3 — shell + hash routing + fixture | - [x] Shell card created |
| **4. project-load-state** | step 4 — load over s1 `GET /api/project` | - [x] Load card created |
| **5. ioutput-mime-renderer** | step 5 — MIME registry (before output-bearing renderers) | - [x] MIME renderer card created |
| **6. renderer batch 6A-6D** | step 6 — code/md/text, sql, viz/bignum/img, inputs/button/sep | - [x] Four renderer cards created |
| **7. unknown-type-fallback** | step 7 — fallback + full-coverage matrix + R7 grade | - [x] Fallback card created |
| **8. Sprint Closeout** | step 8 (final) — mandatory chore | - [x] Closeout card created |

## Sprint Execution Phases

| Phase / Task | Status / Link to Artifact | Universal Check |
| :--- | :--- | :---: |
| **Roadmap Integration** | `m3/s2` (spa-foundation + block-renderers) | - [ ] Story tagged with sprint LUI2VIEW |
| **Take Sprint** | after s1 LUI1WEDGE merges | - [ ] `take_sprint()` claims work |
| **Mid-Sprint Check** | after step 5 (MIME) lands | - [ ] Reviewed `list_cards(group_by_sprint=True)` |
| **Complete Cards** | steps 2-7 | - [ ] Cards moved to done |
| **Sprint Archive** | step 8 closeout | - [ ] `archive_cards()` bundles work |
| **Generate Summary** | step 8 closeout | - [ ] `generate_archive_summary()` |
| **Update Changelog** | `CHANGELOG.md` [1.0.0] viewer entry | - [ ] Release notes recorded |
| **Update Roadmap** | `m3/s2` + its 2 projects | - [ ] Marked complete |

**Execution sequence (step barriers + parallel batches):**

- **Step 1** — Sprint Planning (this card). Sequential.
- **Step 2** — `framework-bundler-setup`. The scaffold + the load-bearing root-`tsconfig` isolation fix. Everything else depends on it. Sequential.
- **Step 3** — `app-shell-and-routing` (shell + hash routing + placeholder BlockRenderer + the shared `ApiProject`-typed fixture). Depends on step 2.
- **Step 4** — `project-load-state` (fetch `GET /api/project`, load state, compile-time `ApiProject` drift test). Depends on step 3 AND on s1 LUI1WEDGE (`server-package-scaffold` + `project-open-list-api`).
- **Step 5** — `ioutput-mime-renderer` (the rendermime MIME registry + `OutputRenderer`). Built BEFORE the output-bearing renderers because they embed it. Depends on step 2 (only needs the scaffold + DOM-env test project; not the load path).
- **Step 6A / 6B / 6C / 6D** — PARALLEL renderer batch (no shared files beyond disjoint registry entries; all embed the step-5 `OutputRenderer`; all depend on step 5 + step 3):
  - 6A `code-markdown-text-renderers`
  - 6B `sql-renderer`
  - 6C `viz-bignumber-image-renderers`
  - 6D `input-button-separator-renderers`
- **Step 7** — `unknown-type-fallback` + full-coverage matrix + graded R7 time-to-first-render (shell-to-render against an ALREADY-RUNNING server). Depends on 6A-6D (the full-coverage fixture needs every renderer to exist).
- **Step 8** — Sprint Closeout (mandatory final N). Depends on all prior.

**Why MIME renderer (roadmap sequence 5) sequences as step 5, before the sequence-1 code renderer:** the design doc's Roadmap Connection note is explicit — `ioutput-mime-renderer` is a build dependency of the output-bearing renderers (code/sql/viz embed `<OutputRenderer>`), so its work lands before them even though the roadmap lists it later within `block-renderers`.

**Parallelization note:** the four step-6 renderer cards each create their own `src/blocks/*Renderer.tsx` files and add one disjoint entry to the `BlockRenderer` registry (`Record<DeepnoteBlock['type'], FC>`). To avoid a registry merge conflict, the registry file's per-type wiring is additive-only; if dispatched truly concurrently, the executor appends its entry (no edit of another card's entry). The dispatcher may also run them sequentially within step 6 — they are independent either way.

## Sprint Closeout & Retrospective

The mandatory closeout card (step 8, **ID `zuyt1y`**) archives done cards, generates the sprint summary, updates `CHANGELOG.md` for the user-visible viewer, marks roadmap story `m3/s2` (and its two projects) complete, and walks every accumulated `## Sprint Retrospective` item through the four-type deferral grid. Planners append retro items to it during the sprint.

| Task | Detail/Link |
| :--- | :--- |
| **Cards Archived** | step 8 closeout — `archive_cards(all_done=True)` |
| **Sprint Summary** | step 8 closeout — `generate_archive_summary()` |
| **Changelog Entry** | `CHANGELOG.md` [1.0.0] — `apps/studio` viewer |
| **Roadmap Updated** | `m3/s2` + `spa-foundation` + `block-renderers` marked done |
| **Retrospective** | walked at step 8 closeout via four-type deferral grid |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Incomplete Cards** | carry over only if s1 dependency slips step 4 |
| **Stub Cards** | none — all cards fully specified |
| **Technical Debt** | append to closeout `## Sprint Retrospective` as discovered |
| **Process Improvements** | captured at closeout |
| **Dependencies/Blockers** | s1 LUI1WEDGE (`server-package-scaffold` + `project-open-list-api`) gates step 4 |

## [1.1.0] - 2025-11-18

### Added
- `apps/studio` — the read-only Deepnote viewer SPA (React 19 + Vite 7, fork-only showcase): loads a project over the s1 `GET /api/project` and renders every block type plus persisted Jupyter `IOutput`s read-only. _(Actual release version/date set at closeout; this heading is the template's literal validator anchor.)_

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.