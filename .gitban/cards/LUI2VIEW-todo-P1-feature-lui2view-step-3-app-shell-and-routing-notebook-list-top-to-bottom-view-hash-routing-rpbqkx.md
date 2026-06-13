# LUI2VIEW step 3 app-shell-and-routing — notebook list + top-to-bottom view + hash routing

> **Sprint**: LUI2VIEW | **Step**: 3 | **Roadmap**: `m3/s2/spa-foundation/app-shell-and-routing` | **Depends on**: step 2 (`o572iu` scaffold).

## UI Feature Overview

* **Feature Description:** The app shell — a left-hand notebook list and the active notebook rendered top-to-bottom, with in-app hash routing between notebooks. Runs against an in-memory fixture project (no network yet).
* **UI Components:** `src/shell/App.tsx`, `NotebookList.tsx`, `NotebookView.tsx`; a placeholder `BlockRenderer` (labelled stub per block until the real renderers arrive in steps 5-7).
* **User Story:** As a user, I see all my project's notebooks in a left rail, click one to view it, and the active notebook renders its blocks top-to-bottom — and a `#/notebook/<id>` URL deep-links straight to a notebook.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 2 (lines ~481-513) + Architecture "Foundation" + Key Design Decision 4 (routing is in-app hash, not `react-router`).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** step 2 scaffold (`o572iu`); the `ApiProject` type the fixture is typed against (s1-owned, imported in step 4).
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 2 | `docs/designs/m3-s2-viewer.md` (Phase 2, lines ~481-513) | Deliverables, the 3 component tests, DoD. |
| Design Architecture + KD4 | `docs/designs/m3-s2-viewer.md` (lines ~186-192, ~276-281) | Shell layout; routing is in-app state mirrored to `location.hash`, NOT `react-router`. |
| `ApiProject` shape | `docs/designs/m3-s1-server-api-and-serve.md` (lines ~366-377) | The fixture must be typed `: ApiProject`; view-models derive from `ApiProject['project']`. |
| Block model | `packages/blocks/src/deepnote-file/deepnote-file-schema.ts` | `project.notebooks[]` = `{ id, name, blocks, executionMode? }`; block order is display order. |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `<App>` owns load state and renders `<NotebookList>` (left rail) + `<NotebookView>` (active notebook). | Design Architecture "Foundation". |
| **Layout Strategy** | Left rail list + main column; `NotebookView` maps `notebook.blocks` in array order to one `<BlockRenderer>` each. | `.deepnote` block order IS the display order. |
| **Navigation & Routing** | Selected `notebookId` in React state, mirrored to `location.hash` (`#/notebook/<id>`); default selects `initNotebookId` or the first notebook. | KD4 — no `react-router`; a hash/state selector keeps the dependency surface minimal. |
| **Loading States** | n/a this card (in-memory fixture; load UI is step 4). | Phase 2 is network-free. |
| **Error States** | n/a this card. | Step 4. |
| **State Management** | React built-ins (`useState`/`useReducer` + context, or one tiny store). | KD5 — read-only viewer needs no Redux/heavy lib. |
| **Accessibility** | List entries are keyboard-focusable/selectable; Biome a11y satisfied. | a11y from day one (ADR-006). |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 2 | - [ ] Shell + routing model understood. |
| **Component Planning** | App/NotebookList/NotebookView + placeholder BlockRenderer | - [ ] Components identified. |
| **Accessibility Plan** | keyboard-selectable list | - [ ] a11y plan noted. |
| **Component Development** | `src/shell/*` + `src/__fixtures__/` | - [ ] Components + fixture built. |
| **Component Testing** | list / order / routing tests | - [ ] All 3 component tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | dev-run shell | - [ ] Shell renders the fixture. |
| **UX Review** | top-to-bottom render reads correctly | - [ ] Order matches array order. |
| **Deployment** | fork dev branch | - [ ] Shell ships behind the fixture. |

## Component Implementation Workflow

TDD: write the list/order/routing tests against the fixture first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | `App.tsx`, `NotebookList.tsx`, `NotebookView.tsx`, `__fixtures__/project.ts` | - [ ] Files created. |
| **2. Write Component Tests** | list renders N entries; click selects + updates hash; blocks render in array order; `#/notebook/<id>` selects | - [ ] Tests written before components. |
| **3. Implement Component** | shell + hash routing + placeholder BlockRenderer | - [ ] Components satisfy tests. |
| **4. Style Component** | minimal rail + column | - [ ] Layout legible. |
| **5. Add Accessibility** | keyboard-selectable entries | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | click notebooks; deep-link a hash | - [ ] Routing verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

The shared fixture (`apps/studio/src/__fixtures__/`) is typed `: ApiProject` (the ~20-block reference workload, full envelope) and is reused by steps 4-7. Typing it now (against the s1-owned `ApiProject`) seeds the compile-time drift catch even before step 4 wires the real fetch. `BlockRenderer` here is a placeholder that renders a labelled stub per `block.type`; steps 5-7 replace the stubs with real renderers via the registry.

## Definition of Done

### Intent

A user opens the viewer and sees every notebook in their project as a clickable left-hand list; selecting one shows that notebook's blocks rendered top-to-bottom in the order they appear in the file, and the browser URL hash reflects the selection so a notebook is deep-linkable. If this breaks, a user would notice a missing or mis-ordered notebook, a click that doesn't switch notebooks, or a `#/notebook/<id>` link that lands on the wrong (or no) notebook. Everything runs off an in-memory fixture; no network yet.

### Observable outcomes

- [ ] `NotebookList` renders one entry per notebook in the fixture project.
- [ ] `NotebookView` renders `notebook.blocks` top-to-bottom in array order (DOM order matches `blocks[]` index order).
- [ ] A shared fixture typed `: ApiProject` exists under `apps/studio/src/__fixtures__/` (the ~20-block reference workload, full envelope).
- [ ] **Capstone (selection + routing):** given the fixture with notebooks A, B, C, clicking B in the list makes `NotebookView` show B's blocks (not A's) and sets `location.hash` to `#/notebook/<B.id>`; loading the app at `#/notebook/<C.id>` selects C on first paint; loading with no hash selects `initNotebookId` (or the first notebook).
- [ ] `apps/studio/README.md` is updated with the shell/routing model.

## Acceptance Criteria

- [ ] All notebooks render in the list; selection routes and updates the hash.
- [ ] Active notebook renders blocks top-to-bottom in persisted order.
- [ ] All shell/routing component tests pass against the fixture.
- [ ] No `react-router` dependency is added (routing is in-app hash state).

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/shell/` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Biome a11y passes; list keyboard-selectable |
| **Browser Test Matrix** | dev-run on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | n/a (graded at step 4/7) |
| **Design Sign-off** | design doc Phase 2 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Yes — README shell/routing section. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Keyboard-selectable list entries. |
| **Performance Issues?** | None this card. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 2.)
* [ ] Component structure follows project architecture and design system. (Architecture Foundation.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (list/order/routing.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (n/a; step 4/7.)
* [ ] Designer/UX team reviewed and approved final implementation. (design doc.)
* [ ] Component documentation updated (Storybook, component library). (README.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (dev-runs against fixture.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.