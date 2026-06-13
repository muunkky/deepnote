# step 3: spa-foundation app shell + routing

> **Design Phase 2** (`docs/designs/m3-s2-viewer.md` ~lines 481–513). Sprint **LUIVIEW1** step 3. The app renders a left-hand notebook list and the active notebook top-to-bottom, routing between notebooks — against an in-memory `: ApiProject` fixture (no network yet). Depends on **step 2** (scaffold).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `spa-foundation` / feature `app-shell-and-routing`; sprint LUIVIEW1 step 3
* **Feature Area/Component:** `apps/studio/src/shell` (App, NotebookList, NotebookView) + hash routing
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

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

* [ ] Notebook list renders all notebooks; selecting one routes and updates the hash.
* [ ] Active notebook renders its blocks top-to-bottom in persisted `blocks[]` order.
* [ ] Loading `#/notebook/<id>` selects that notebook; default selects `initNotebookId` (or the first).
* [ ] All shell/routing component tests pass against the fixture.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 2 | - [ ] Design Complete |
| **Test Plan Creation** | list / order / routing component tests | - [ ] Test Plan Approved |
| **TDD Implementation** | App + NotebookList + NotebookView + fixture | - [ ] Implementation Complete |
| **Integration Testing** | DOM-env vitest against the fixture | - [ ] Integration Tests Pass |
| **Documentation** | README shell/routing model | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | list (N notebooks, click routes + updates hash), order (DOM order == array order), routing (`#/notebook/<id>` + default) | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | App/NotebookList/NotebookView + hash sync + fixture | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green against the fixture | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy routing/state plumbing | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary still green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (no network; render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against the shared `: ApiProject` fixture in the DOM-env vitest project (jsdom + `@testing-library/react`). TDD: tests first. The order test asserts DOM order matches `blocks[]` array order; the list test asserts a click updates both active notebook and `location.hash`.

**Key Implementation Decisions:** `ProjectVM = ApiProject["project"]`, `NotebookVM = ProjectVM["notebooks"][number]` — derived, never re-declared.

## Definition of Done

**Intent (plain English):** Open the app against a hand-built in-memory project and you see every notebook listed on the left; click one and the main pane shows that notebook's cells in the exact order they were saved, and the URL hash updates so the view is linkable. No server is involved yet — this proves the shell and routing work purely from data.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** given the `: ApiProject` fixture, `NotebookList` renders **N** notebook entries (assert N real DOM entries for an N-notebook fixture); clicking an entry routes to it (active notebook updates) **and** updates `location.hash`; and `NotebookView` renders the active notebook's blocks in persisted array order (assert rendered DOM order equals `blocks[]` order).
* [ ] Loading `#/notebook/<id>` selects that notebook; with no hash, the default selects `initNotebookId` (or the first notebook).
* [ ] The fixture is typed `: ApiProject` (compile-time), with all view-models derived from it — no re-declared project shape.
* [ ] All shell/routing component tests pass in the DOM-env vitest project.

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

* [ ] All acceptance criteria are met and verified.
* [ ] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
* [ ] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
