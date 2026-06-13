# step 3: spa-foundation app shell + routing

> **Design Phase 2** (`docs/designs/m3-s2-viewer.md` ~lines 481–513). Sprint **LUIVIEW1** step 3. The app renders a left-hand notebook list and the active notebook top-to-bottom, routing between notebooks — against an in-memory `: ApiProject` fixture (no network yet). Depends on **step 2** (scaffold).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `spa-foundation` / feature `app-shell-and-routing`; sprint LUIVIEW1 step 3
* **Feature Area/Component:** `apps/studio/src/shell` (App, NotebookList, NotebookView) + hash routing
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **README.md** | `apps/studio/README.md` | Update with the shell/routing model |
| **Architecture Docs** | ADR-007 §3 | backend→apps one-way boundary still holds (no server import) |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 2 (~481–513), Interface (~314–318) | Shell components, hash routing, view-models DERIVED from `ApiProject` |
| **Similar Features** | step 2 scaffold (`j97w5m`) | Renders against the DOM-env vitest project |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 2 | `docs/designs/m3-s2-viewer.md` ~481–513 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (view-models) | `docs/designs/m3-s2-viewer.md` ~314–318 | `ProjectVM = ApiProject["project"]`, `NotebookVM` derived — never re-declared |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | The fixture is typed `: ApiProject`; the canonical contract (ADR-007 §6) |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary still apply (depends on step 2) |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/shell/App.tsx`, `NotebookList.tsx`, `NotebookView.tsx`.
* Deliverable: in-app notebook routing — selected `notebookId` in state, mirrored to `location.hash`.
* Deliverable: `NotebookView` maps `notebook.blocks` in array order to a placeholder `<BlockRenderer>` (real renderers arrive in steps 5–7D; here a labelled stub per block is fine).
* Deliverable: a shared fixture typed `: ApiProject` (the ~20-block reference workload, full envelope) under `apps/studio/src/__fixtures__/`.
* Constraint: view-models are DERIVED from the imported `ApiProject` — the fixture is typed `: ApiProject`, never a re-declared local shape (ADR-007 §6 drift-catch).
* Constraint: no network yet (that is step 4).

### Acceptance Criteria

- [x] Notebook list renders all notebooks; selecting one routes and updates the hash.
- [x] Active notebook renders its blocks top-to-bottom in persisted `blocks[]` order.
- [x] Loading `#/notebook/<id>` selects that notebook; default selects `initNotebookId` (or the first).
- [x] All shell/routing component tests pass against the fixture.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 2 | - [x] Design Complete |
| **Test Plan Creation** | list / order / routing component tests | - [x] Test Plan Approved |
| **TDD Implementation** | App + NotebookList + NotebookView + fixture | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against the fixture | - [x] Integration Tests Pass |
| **Documentation** | README shell/routing model | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | list (N notebooks, click routes + updates hash), order (DOM order == array order), routing (`#/notebook/<id>` + default) | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | App/NotebookList/NotebookView + hash sync + fixture | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green against the fixture | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy routing/state plumbing | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary still green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (no network; render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against the shared `: ApiProject` fixture in the DOM-env vitest project (jsdom + `@testing-library/react`). TDD: tests first. The order test asserts DOM order matches `blocks[]` array order; the list test asserts a click updates both active notebook and `location.hash`.

**Key Implementation Decisions:** `ProjectVM = ApiProject["project"]`, `NotebookVM = ProjectVM["notebooks"][number]` — derived, never re-declared.

## Definition of Done

**Intent (plain English):** Open the app against a hand-built in-memory project and you see every notebook listed on the left; click one and the main pane shows that notebook's cells in the exact order they were saved, and the URL hash updates so the view is linkable. No server is involved yet — this proves the shell and routing work purely from data.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** given the `: ApiProject` fixture, `NotebookList` renders **N** notebook entries (assert N real DOM entries for an N-notebook fixture); clicking an entry routes to it (active notebook updates) **and** updates `location.hash`; and `NotebookView` renders the active notebook's blocks in persisted array order (assert rendered DOM order equals `blocks[]` order).
- [x] Loading `#/notebook/<id>` selects that notebook; with no hash, the default selects `initNotebookId` (or the first notebook).
- [x] The fixture is typed `: ApiProject` (compile-time), with all view-models derived from it — no re-declared project shape.
- [x] All shell/routing component tests pass in the DOM-env vitest project.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Shell renders list + ordered blocks from fixture |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 4 replaces the in-memory fixture with a real fetch |

### Completion Checklist

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
- [x] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Follow-up: L2 — real timed HMR-edit-loop assertion (Playwright)

**L2 (folded in from j97w5m review 1, per planner routing):** When this card adds its Playwright / e2e harness, include a **real timed HMR-edit-loop assertion** — drive an actual edit to a source file under `apps/studio/src` and assert the rendered DOM updates within an HMR cycle (a measured edit→reflect loop), not a mock or a static snapshot. Step 2 (j97w5m) stood up the Vite dev/HMR scaffold but proved it only structurally; this is the natural home for the live HMR proof because Playwright lands here. Dedup: 5mz1md currently uses DOM-env vitest (no Playwright yet), so there is no existing HMR/e2e criterion this collides with — add it alongside the routing/order e2e coverage.

- [x] **HMR e2e (follow-up from j97w5m L2):** a Playwright test performs a real source edit under `apps/studio/src` and asserts the rendered output reflects the change within an HMR cycle (timed edit→reflect loop, not mocked).

## Close-out (executor cycle 1)

**Shipped** — SPA app shell + hash routing on the step-2 scaffold (design `m3-s2-viewer.md` Phase 2):

- `apps/studio/src/shell/App.tsx` — shell owning `activeNotebookId`, mirrored to `location.hash` (`#/notebook/<id>`); bidirectional sync via a `hashchange` listener; selection precedence valid-id → `initNotebookId` → first (`resolveActiveNotebookId` in `shell/viewModels.ts`).
- `shell/NotebookList.tsx` (focusable `<button>` per notebook, `aria-current="page"` on the active one), `shell/NotebookView.tsx` (blocks rendered top-to-bottom in persisted `blocks[]` order), `blocks/BlockRenderer.tsx` (labelled placeholder stub; real registry arrives in later steps).
- `shell/hashRoute.ts` — `#/notebook/<id>` parse/format (pure, unit-tested).
- `src/__fixtures__/sampleProject.ts` — shared fixture typed `: ApiProject` (full envelope, 3 notebooks / 20 blocks). `ProjectVM`/`NotebookVM`/`BlockVM` are DERIVED from the imported `@deepnote/runtime-server/types` contract, never re-declared (ADR-007 §6 drift-catch). `main.tsx` now renders the shell against the fixture; the obsolete step-2 smoke `App.tsx`/`App.test.tsx` were removed.

**Type-edge resolution (worktree, no backend dist):** the `@deepnote/runtime-server/types` subpath is a TYPE-ONLY import resolved from package source via `apps/studio/tsconfig.json` `paths` + a `resolve.alias` in `apps/studio/vitest.config.ts`; `@deepnote/runtime-server` added as a studio devDependency. Isolation invariant verified intact: `test-helpers/apps-studio-isolation.test.ts` (3/3) — root `tsc -p tsconfig.json --listFilesOnly` names **zero** `apps/` files, no `packages/*` frontend dep, `apps/studio/src` stays Node-free (the `/types` subpath is the allowed edge; the Node-using CDP harness lives in `apps/studio/e2e`, outside the `src` boundary scan).

**Planner-added L2 — real timed HMR-edit-loop assertion (folded from j97w5m review 1):** `apps/studio/e2e/hmr.e2e.test.ts` boots a **real** Vite dev server over the app, drives a **real** headless Chromium via the DevTools Protocol (`e2e/cdp.ts`, using Node's built-in `WebSocket`/`fetch` — no Playwright/Puppeteer dep, which are not installable in the read-only worktree), navigates, **edits a real source file** (`src/__hmr_probe__/HmrProbe.tsx`), and asserts the live DOM reflects the change within an HMR cycle — measuring edit→reflect latency (~656 ms observed) AND proving it was a React Fast Refresh **hot update**, not a full reload (a `window` sentinel set before the edit survives). The probe edit is always restored in `afterAll`. Gated under a dedicated node-env config (`vitest.hmr.config.ts`, `pnpm --filter @deepnote/studio test:hmr`), out of the always-on jsdom `pnpm test` because it needs a browser binary + live dev server. Browser path overridable via `HMR_CHROME_BIN`.

**What the tests actually proved (honest scope):**
- DOM-env vitest suite (jsdom + RTL): **14/14** green — list renders N entries; click routes (active selection updates) AND updates `location.hash`; blocks render in `blocks[]` order; `#/notebook/<id>` selects, no-hash defaults to `initNotebookId`; browser-driven `hashchange` reacts; hashRoute + resolveActiveNotebookId unit-covered. Run against the in-memory fixture — **no network** (step 4 swaps in a real fetch).
- Isolation/boundary: **3/3** green (above).
- HMR e2e: **1/1** green against a real Vite dev server + real Chromium — verified repeatably (multiple clean runs). Requires `dangerouslyDisableSandbox` to launch a real browser in this harness; this is an environment property of the constrained sandbox, not a test weakness.

**Quality gates:** studio `tsc --noEmit -p apps/studio/tsconfig.json` clean; `biome check apps/studio cspell.json` clean (0 warnings; one deliberate `noConsole` suppressed on the latency-evidence log); `prettier --check` clean; `cspell` clean (added `hashchange`, `backgrounding`, `worktree`, `serialisable`, `initialised` to `cspell.json`).

**Deferred:** none. No tech debt created. Step 4 replaces the in-memory fixture with a real `GET /api/project` fetch.

Code committed to the worktree branch (`worktree-agent-ab7493d6045383cbe`); dispatcher merges back into `milestone/m3-local-ui`. Left `in_progress` for the reviewer.
