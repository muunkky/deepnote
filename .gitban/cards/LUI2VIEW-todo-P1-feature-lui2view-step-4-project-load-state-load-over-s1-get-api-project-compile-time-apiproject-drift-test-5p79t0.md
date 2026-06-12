# LUI2VIEW step 4 project-load-state — load over s1 GET /api/project + compile-time ApiProject drift test

> **Sprint**: LUI2VIEW | **Step**: 4 | **Roadmap**: `m3/s2/spa-foundation/project-load-state` | **Depends on**: step 3 (`rpbqkx` shell) AND s1 LUI1WEDGE (`server-package-scaffold` = the Node-free `api-types` entry exporting `ApiProject`; `project-open-list-api` = `GET /api/project`). BLOCKED until those s1 features are merged.

## UI Feature Overview

* **Feature Description:** Wire the shell to a REAL project fetched from the s1 server over `GET /api/project`, with loading and error states, importing `ApiProject` from `@deepnote/runtime-server/types` — never re-declaring the shape.
* **UI Components:** `src/api/fetchProject.ts`, `src/state/projectStore.ts`, plus loading-spinner and error-banner UI wired into `<App>`.
* **User Story:** As a user, when I open the viewer it fetches my real project from the running server, shows a spinner while loading, renders the shell from real data on success, and shows an actionable banner (e.g. "deepnote-toolkit not installed") on failure.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 3 (lines ~517-562) + Interface Design (lines ~298-339) + Key Design Decision on importing `ApiProject` (C1).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** s1 LUI1WEDGE `project-open-list-api` + `server-package-scaffold`; step 3 shell.
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 3 | `docs/designs/m3-s2-viewer.md` (Phase 3, lines ~517-562) | Deliverables, the compile-time drift test, state test, type-only-import test, R7 checkpoint. |
| Design Interface (C1/M2) | `docs/designs/m3-s2-viewer.md` (lines ~298-339) | `fetchProject(): Promise<ApiProject>`; `ProjectState` discriminated union; consume FULL envelope incl. `capabilities`. |
| s1 `ApiProject` contract | `docs/designs/m3-s1-server-api-and-serve.md` (lines ~349-377) | `api-types.ts` is the single source of truth; `ApiProject = { path, metadata, project, openHash, capabilities }`; import it, do NOT re-declare. |
| ADR-007 §6 | `docs/adr/ADR-007-server-spa-package-layout.md` (lines ~133-156) | Import ONLY the Node-free `api-types` entry (`@deepnote/runtime-server/types`); no Node import reaches the SPA. |
| Capabilities/KD-6 | `docs/designs/m3-s1-server-api-and-serve.md` (KD-6, lines ~302-317) | `GET /api/project` needs no kernel; `capabilities` drives the "kernel missing" UI state (render-only here). |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `fetchProject(baseUrl=""): Promise<ApiProject>` (GET only, throws typed `ProjectLoadError` on non-2xx/network); `projectStore` holds `{ status: 'loading' } \| { status: 'loaded'; project; capabilities; activeNotebookId } \| { status: 'error'; error }`. | Interface Design; read-only (no POST/WS, R8). |
| **Contract type** | `import type { ApiProject } from '@deepnote/runtime-server/types'`; derive view-models from `ApiProject['project']`; NEVER re-declare. | C1 — a local shape defeats the compile-time drift catch. |
| **Loading States** | Spinner while `status: 'loading'`. | Phase 3 deliverable. |
| **Error States** | Banner carrying the s1-surfaced actionable message (e.g. "deepnote-toolkit not installed") — render only; no run/retry execution. | R8 read-only; KD-6. |
| **State Management** | React built-ins / one tiny store. | KD5. |
| **Accessibility** | Spinner has an accessible label; error banner is announced (`role="alert"`/`aria-live`). | a11y from day one. |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 3 | - [ ] Load path + import boundary understood. |
| **Component Planning** | fetchProject + projectStore + loading/error UI | - [ ] Components identified. |
| **Accessibility Plan** | labelled spinner; alert banner | - [ ] a11y plan noted. |
| **Component Development** | `src/api/`, `src/state/`, wired into App | - [ ] Built. |
| **Component Testing** | drift (compile-time) + state + type-only-import + runtime fetch | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | load against a running s1 server | - [ ] Real project renders. |
| **UX Review** | spinner → shell; error → banner | - [ ] States read correctly. |
| **Deployment** | fork dev branch | - [ ] Ships once s1 merged. |

## Component Implementation Workflow

TDD: the drift test is the headline — write it first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | `fetchProject.ts`, `projectStore.ts`, loading/error UI | - [ ] Files created. |
| **2. Write Component Tests** | compile-time drift assertion; store transitions; type-only-import check; runtime fetch happy/error | - [ ] Tests written first. |
| **3. Implement Component** | fetch + store + App wiring | - [ ] Satisfies tests. |
| **4. Style Component** | spinner + banner | - [ ] Legible. |
| **5. Add Accessibility** | labelled spinner, alert banner | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | run s1 server; load; kill kernel to see error banner | - [ ] States verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

**The drift catch is type-level, not a runtime mock (C1).** `fetchProject`'s return type IS the imported `ApiProject`. Add a `tsc`-checked assertion — e.g. `expectTypeOf<Awaited<ReturnType<typeof fetchProject>>>().toEqualTypeOf<ApiProject>()` — and keep the shared fixture typed `: ApiProject`. Because the SPA imports `ApiProject` rather than re-declaring it, any unabsorbed s1 contract change is a COMPILE error, not a silent runtime mismatch. The type-only-import test (lint/grep or a `tsc` trace) asserts the only thing imported from `@deepnote/runtime-server` is types from the Node-free `/types` entry.

## Definition of Done

### Intent

When a user opens the viewer against a running `deepnote serve`, it fetches their actual project from `GET /api/project`, loads it into app state, and the shell renders from real data instead of the fixture; while loading it shows a spinner, and on a fetch/server failure it shows a banner with the message the server surfaced (e.g. a missing toolkit). If this breaks, a user would see a spinner that never resolves, a blank shell, or an error with no actionable message. The viewer consumes the s1 contract type directly — if s1 changes the contract in a way the SPA hasn't absorbed, the build fails rather than the UI rendering wrong data.

### Observable outcomes

- [ ] `fetchProject` is declared `(): Promise<ApiProject>`, imports `ApiProject` from `@deepnote/runtime-server/types`, does GET only, and throws a typed `ProjectLoadError` on non-2xx/network failure.
- [ ] `projectStore` holds the `loading | loaded | error` discriminated state carrying `project: ApiProject['project']` + `capabilities`; the store transitions `loading → loaded` on success and `loading → error` on failure.
- [ ] **Compile-time drift capstone:** a `tsc`-checked type assertion ties `fetchProject`'s return type to the imported `ApiProject` (e.g. `expectTypeOf(...).toEqualTypeOf<ApiProject>()`) and the fixture is typed `: ApiProject`; introducing a divergent field is a `tsc` error, not a passing runtime test. (Verify by temporarily mutating a local copy and confirming `tsc` reds.)
- [ ] **End-to-end load capstone:** against an already-running s1 server, `<App>` fetches `GET /api/project`, loads it into state, and renders the shell from the REAL project (notebooks list + active notebook); on a forced failure it renders the banner carrying the s1-surfaced message; while pending it renders the spinner.
- [ ] **Type-only-import capstone:** a check (lint/grep or `tsc --listFiles`/`madge`) proves the only import from `@deepnote/runtime-server` is types from the Node-free entry — no value import, no Node module reachable from the SPA.
- [ ] **R7 checkpoint (graded — split a):** shell-to-render against an ALREADY-RUNNING server (browser → rendered shell with the real project; blocks still placeholder until step 5+) is measured and recorded; re-measured at step 7 once renderers exist. The cold `deepnote serve`-to-render (split b) is s1-gated, reported not graded here.
- [ ] `apps/studio/README.md` documents the load path + the `api-types` import boundary.

## Acceptance Criteria

- [ ] `<App>` fetches, loads, and renders the shell from real data; loading + error states render correctly.
- [ ] The SPA imports ONLY types from `@deepnote/runtime-server`'s Node-free entry; boundary + type-only-import tests pass.
- [ ] The compile-time drift test fails the build on an unabsorbed contract change.
- [ ] Shell-to-render against an already-running server is measured (R7 split a).

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/api/`, `apps/studio/src/state/` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Spinner labelled; error banner `role="alert"` |
| **Browser Test Matrix** | load against running s1 server on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | R7 shell-to-render against already-running server (split a) |
| **Design Sign-off** | design doc Phase 3 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Yes — README load-path + import-boundary note. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Alert-role error banner. |
| **Performance Issues?** | R7 split-a measured here. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 3.)
* [ ] Component structure follows project architecture and design system. (Interface Design.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (drift + state + type-only + fetch.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (R7 split a.)
* [ ] Designer/UX team reviewed and approved final implementation. (design doc.)
* [ ] Component documentation updated (Storybook, component library). (README.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (loads real project on fork branch.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.