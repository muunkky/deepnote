# step 4: spa-foundation project load over s1 API + state

> **Design Phase 3** (`docs/designs/m3-s2-viewer.md` ~lines 517–563). Sprint **LUIVIEW1** step 4. The shell renders a **real** project fetched from the s1 server, with loading/error states. Depends on **step 3** and on **s1** (`m3/s1/serve-api/project-open-list-api` — the `GET /api/project` endpoint + the Node-free `api-types` entry — must be merged).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `spa-foundation` / feature `project-load-state`; sprint LUIVIEW1 step 4
* **Feature Area/Component:** `apps/studio/src/api/fetchProject.ts`, `apps/studio/src/state/projectStore.ts`
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
| **README.md** | `apps/studio/README.md` | Note the load path + the `api-types` import boundary |
| **Architecture Docs** | ADR-007 §4, §6 | SPA imports types-only from the Node-free entry; compile-time drift-catch |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 3 (~517–563), Interface (~319–339) | `fetchProject` signature, `ProjectState` discriminated union |
| **API Specs** | `@deepnote/runtime-server/types` (`api-types.ts`) | `ApiProject` is the FULL envelope: `{ path, metadata, project, openHash, capabilities }` |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 3 | `docs/designs/m3-s2-viewer.md` ~517–563 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (client + store) | `docs/designs/m3-s2-viewer.md` ~319–339 | `fetchProject(baseUrl): Promise<ApiProject>`; `ProjectState = loading \| loaded \| error` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | The return type — imported, never re-declared (ADR-007 §6) |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + type-only-import boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/api/fetchProject.ts` — `GET /api/project`, returns the **full** `ApiProject` envelope imported from `@deepnote/runtime-server/types`; throws a typed `ProjectLoadError` on non-2xx / network failure. Read-only: GET only, no POST/WS (R8).
* Deliverable: `src/state/projectStore.ts` — the `{ status: "loading" } | { status: "loaded"; project; capabilities; activeNotebookId } | { status: "error"; error }` discriminated state, wired into `App`.
* Deliverable: loading + error UI. The error UI carries the actionable message the s1 API surfaces (e.g. "deepnote-toolkit not installed") — rendering only, no run/retry execution.
* Constraint (C1): `fetchProject`'s return type **is** the imported `ApiProject` — drift cannot be silent because there is no second shape to drift from.
* Constraint (R2): the only thing imported from `@deepnote/runtime-server` is types from the Node-free entry.

### Acceptance Criteria

* [ ] `App` fetches `GET /api/project`, loads it into state, and renders the shell from real data.
* [ ] Loading and error states render correctly (error shows the s1-surfaced message).
* [ ] The SPA imports **only** types from `@deepnote/runtime-server`'s Node-free entry; boundary check + type-only-import test pass.
* [ ] R7 checkpoint (split a): shell-to-render against an already-running server is measured (blocks still placeholder until step 5+).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 3 | - [ ] Design Complete |
| **Test Plan Creation** | compile-time drift test + state test + type-only-import test | - [ ] Test Plan Approved |
| **TDD Implementation** | fetchProject + projectStore + loading/error UI | - [ ] Implementation Complete |
| **Integration Testing** | Against a real (or test-double) s1 server | - [ ] Integration Tests Pass |
| **Documentation** | README load path + `api-types` boundary | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | compile-time `expectTypeOf<Awaited<ReturnType<typeof fetchProject>>>().toEqualTypeOf<ApiProject>()`; runtime 2xx→fixture / non-2xx→typed error; store transitions; type-only-import assertion | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | fetchProject + ProjectLoadError + projectStore + UI | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green; type assertions compile | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy fetch/error plumbing | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation/boundary green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | R7 split a: shell-to-render against already-running server measured | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** DOM-env vitest project (jsdom + `@testing-library/react`), tests first. The drift-catch is a **compile-time** type-level assertion (not a runtime mock of a local shape): because the SPA imports `ApiProject` rather than re-declaring it, any s1 contract change the SPA hasn't absorbed is a compile error. A runtime test still asserts the fixture on 2xx and the typed error on non-2xx, and the store transitions `loading → loaded` / `loading → error`.

**Key Implementation Decisions:** Read-only — GET only, no POST/WS. Error UI renders the s1-surfaced actionable message; no retry/run execution here.

## Definition of Done

**Intent (plain English):** Start the real s1 server, open the app, and the app reaches out over HTTP, pulls the whole project, and renders the shell from that live data — not a fixture. If the server returns a failure, the app shows a clear error banner with the message the server provided, instead of crashing. The project's shape is the server's own contract type, so the two can never silently disagree.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** against a real (or test-double) s1 server, the shell fetches `GET /api/project` and renders the project (assert real notebooks from the response appear in the DOM); and a non-2xx response drives the **error** state (assert the error banner with the s1-surfaced message renders, not the shell).
* [ ] `fetchProject` returns the imported `ApiProject` (compile-time `expectTypeOf` assertion holds; fixture typed `: ApiProject`).
* [ ] The store transitions `loading → loaded` on success and `loading → error` on failure; `App` renders spinner / shell / banner respectively.
* [ ] The only import from `@deepnote/runtime-server` is types from the Node-free entry (type-only-import + boundary check pass).
* [ ] R7 split a (shell-to-render against an already-running server) is measured and reported.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Real fetch renders shell; non-2xx renders banner |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 5 replaces placeholder blocks with real renderers |

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
