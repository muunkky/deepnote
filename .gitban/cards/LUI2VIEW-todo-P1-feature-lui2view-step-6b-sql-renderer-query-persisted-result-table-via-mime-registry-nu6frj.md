# LUI2VIEW step 6B sql-renderer — query + persisted result table via MIME registry

> **Sprint**: LUI2VIEW | **Step**: 6B (parallel batch with 6A/6C/6D) | **Roadmap**: `m3/s2/block-renderers/sql-renderer` | **Depends on**: step 5 (`hch3tp` OutputRenderer/MIME registry) + step 3 (`rpbqkx` shell/dispatcher).

## UI Feature Overview

* **Feature Description:** Read-only renderer for SQL blocks: shows the query (syntax-highlighted) and its persisted result table via `<OutputRenderer>` (the result is typically a persisted `text/html`/`text/plain` output, flowing through the MIME registry).
* **UI Components:** `src/blocks/SqlRenderer.tsx`; registry entry for `sql`.
* **User Story:** As a user, a SQL block shows the query I wrote and the result table it last produced — and a SQL block that never ran shows just the query.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 6 (lines ~638-661).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** step 5 `OutputRenderer`/MIME registry.
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 6 | `docs/designs/m3-s2-viewer.md` (Phase 6, lines ~638-661) | Deliverables, the two component-test cases, read-only assertion, DoD. |
| Output renderer | step 5 `apps/studio/src/outputs/OutputRenderer.tsx` | The result table flows through `<OutputRenderer outputs={block.outputs ?? []}>` (HTML table via the MIME registry). |
| Block model | `packages/blocks/src/deepnote-file/deepnote-file-schema.ts` | `sql` is an output-bearing executable block (`outputs?: IOutput[]`); `block.content` is the SQL. |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `SqlRenderer` = highlighted `block.content` (the SQL) + `<OutputRenderer outputs={block.outputs ?? []}>`. | Result table is a persisted output through the shared MIME registry — no bespoke SQL-result path. |
| **No-output case** | A SQL block with empty `outputs` renders the query alone. | Pure function of persisted state. |
| **Read-only** | NO run control, NO editable query. | R8 — read-only assertion is a test. |
| **Accessibility** | Result table renders as a real table; query has code semantics. | a11y from day one. |
| **Loading/Error States** | n/a (pure render of persisted block). | — |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 6 | - [ ] Renderer + read-only rule understood. |
| **Component Planning** | SqlRenderer + registry entry | - [ ] Component identified. |
| **Accessibility Plan** | result table semantics | - [ ] a11y plan noted. |
| **Component Development** | `src/blocks/SqlRenderer.tsx` | - [ ] Built. |
| **Component Testing** | query+table; query-only; read-only | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | render fixture SQL block | - [ ] Renders. |
| **UX Review** | query + table read correctly | - [ ] Looks right. |
| **Deployment** | fork dev branch | - [ ] Registry entry wired. |

## Component Implementation Workflow

TDD: write the query+table and query-only and read-only tests first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | `SqlRenderer.tsx` + registry entry | - [ ] Files created. |
| **2. Write Component Tests** | renders query + persisted result table; renders query alone when no output; no run/edit | - [ ] Tests written first. |
| **3. Implement Component** | renderer + registry entry | - [ ] Satisfies tests. |
| **4. Style Component** | query + table styling | - [ ] Legible. |
| **5. Add Accessibility** | table semantics | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | view a fixture SQL notebook | - [ ] Verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

Registry wiring is additive (one `sql` entry) so 6A/6B/6C/6D do not conflict. The result table is NOT a bespoke component — it is whatever the persisted output is, rendered through the step-5 MIME registry (an HTML table sanitized, or a `text/plain` fallback).

## Definition of Done

### Intent

A user viewing a notebook with SQL blocks sees the query each block ran and the result table it last produced, rendered as a real table; a SQL block that has never been run shows just its query. If this breaks, a user would see a SQL result rendered as raw text or missing entirely, or an unexpected run/edit control on the query.

### Observable outcomes

- [ ] `SqlRenderer` renders `block.content` (the SQL, syntax-highlighted) and embeds `<OutputRenderer outputs={block.outputs ?? []}>`.
- [ ] **Capstone:** given a fixture SQL block whose persisted output is an HTML result table, the renderer shows the query text AND the result table (rendered through the MIME registry, not as raw text); given a fixture SQL block with empty `outputs`, the renderer shows the query alone and no empty table.
- [ ] Read-only assertion test confirms the rendered SQL block exposes no run control and no editable query (R8).
- [ ] Registry entry for `sql` is wired into `BlockRenderer`.

## Acceptance Criteria

- [ ] SQL blocks render query + persisted result table; tests pass against the fixture.
- [ ] A no-output SQL block renders the query alone.
- [ ] No run control, no editable query (R8).

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/blocks/SqlRenderer.tsx` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Result table real-table semantics; Biome a11y passes |
| **Browser Test Matrix** | render fixture on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | n/a (graded at step 7) |
| **Design Sign-off** | design doc Phase 6 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Inline; coverage matrix at step 7. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Real-table result rendering. |
| **Performance Issues?** | None this card. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 6.)
* [ ] Component structure follows project architecture and design system. (output through MIME registry.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (query+table, query-only, read-only.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (n/a; step 7.)
* [ ] Designer/UX team reviewed and approved final implementation. (design doc.)
* [ ] Component documentation updated (Storybook, component library). (inline.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (renders from fixture.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.