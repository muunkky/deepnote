# LUI2VIEW step 7 unknown-type-fallback — safe fallback + full-coverage matrix + R7 grade

> **Sprint**: LUI2VIEW | **Step**: 7 | **Roadmap**: `m3/s2/block-renderers/unknown-type-fallback` | **Depends on**: 6A (`em1cwd`), 6B (`nu6frj`), 6C (`5hy4pf`), 6D (`hne4ie`) — the full-coverage fixture needs every renderer to exist. The fallback itself is independent but lands here to close the coverage matrix + the R7 bar.

## UI Feature Overview

* **Feature Description:** The `default` dispatch branch — a labelled raw-content fallback for unsupported/unknown block types that never throws — plus the closing of per-block-type coverage (R3) and the graded time-to-first-render (R7, split a) against an ALREADY-RUNNING server.
* **UI Components:** `src/blocks/UnknownBlockRenderer.tsx` (the dispatcher's `default` branch).
* **User Story:** As a user, if my project has a block type the viewer doesn't recognize (a future block kind, or `agent`/`notebook-function`), I see a labelled card with the type and its raw content instead of a blank or crashed notebook — and the rest of the notebook still renders normally.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 8 (lines ~706-751, the fallback half) + Key Design Decision 6 (the `default` branch IS the fallback) + R5/R7.
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** all step-6 renderers (the coverage matrix); step 4 R7 split-a checkpoint (re-measured here).
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 8 | `docs/designs/m3-s2-viewer.md` (Phase 8, lines ~706-751) | Fallback deliverable, fallback/coverage tests, R7 grading, DoD. |
| Design KD6 + R5 | `docs/designs/m3-s2-viewer.md` (lines ~290-295, ~57-59) | Dispatcher `default` branch IS the unknown-type fallback; `DeepnoteBlock` is a discriminated union on `type`. |
| Design R7 (split) | `docs/designs/m3-s2-viewer.md` (R7, lines ~64-71; risk row ~786) | R7 is split: GRADED on shell-to-render against an ALREADY-RUNNING server (kernel-free); cold `deepnote serve`-to-render is s1-gated, reported not graded. |
| BlockRenderer dispatch | step 3 `apps/studio/src/blocks/BlockRenderer.tsx` | The `default` branch delegates to `UnknownBlockRenderer`; this card finalizes it. |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `UnknownBlockRenderer` renders a labelled card showing the block `type` and its raw `content`, never throwing; it IS the dispatcher's `default` branch. | KD6 — discriminated-union dispatch makes the default branch the structural fallback. |
| **Coverage** | A full-coverage fixture containing EVERY in-scope block type renders with no block falling through to an error. | R3 — the per-block-type matrix. |
| **Resilience** | A notebook mixing known and unknown blocks renders the known ones normally and the unknown one as the fallback. | R5 — one bad block never blanks the view. |
| **Performance** | Shell-to-render against an ALREADY-RUNNING server (browser → rendered ~20-block notebook) is well inside budget (graded — split a). Cold `deepnote serve`-to-render reported, s1-gated (split b). | R7 — the viewer is kernel-free, so split a should be well within budget. |
| **Accessibility** | Fallback card is labelled and readable. | a11y from day one. |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 8 + KD6 + R7 split | - [ ] Fallback + coverage + R7-split understood. |
| **Component Planning** | UnknownBlockRenderer as default branch | - [ ] Component identified. |
| **Accessibility Plan** | labelled fallback card | - [ ] a11y plan noted. |
| **Component Development** | `src/blocks/UnknownBlockRenderer.tsx` + dispatcher default | - [ ] Built. |
| **Component Testing** | fallback + mixed-block + full-coverage matrix | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | full-coverage fixture renders; R7 measured | - [ ] Matrix renders; R7 recorded. |
| **UX Review** | unknown block reads as a labelled card | - [ ] Looks right. |
| **Deployment** | fork dev branch | - [ ] Coverage matrix closed. |

## Component Implementation Workflow

TDD: write the fallback + mixed-block + full-coverage tests first; then measure R7.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | `UnknownBlockRenderer.tsx` + dispatcher default wiring | - [ ] Files created. |
| **2. Write Component Tests** | unknown type → labelled fallback (no throw); mixed known+unknown notebook; full-coverage matrix | - [ ] Tests written first. |
| **3. Implement Component** | fallback renderer + default branch | - [ ] Satisfies tests. |
| **4. Style Component** | labelled card styling | - [ ] Legible. |
| **5. Add Accessibility** | labelled card | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | open full-coverage fixture; measure shell-to-render vs already-running server | - [ ] R7 split-a measured by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

The full-coverage fixture extends the shared `: ApiProject` fixture to include every in-scope block type plus a synthetic unknown (e.g. `"future-block"`, or an un-rendered `agent`/`notebook-function`). R7 split-a is measured the SAME way step 4 measured the shell checkpoint — browser hitting an already-running server — now with all renderers present so it is the full render path. The cold-boot number (split b) is reported but bounded by s1 boot, not graded.

## Definition of Done

### Intent

A user whose project contains a block type the viewer doesn't recognize still sees a usable notebook: the unknown block appears as a labelled card showing its type and raw content, and every other block renders normally around it — the viewer never throws or blanks. With this card, every in-scope block type renders, and opening a ~20-block notebook against an already-running server reaches a fully rendered view well within the time budget. If this breaks, a user would notice one odd block crashing the whole notebook into a blank screen, or an in-scope block type unexpectedly falling through to the raw fallback, or a notebook that takes too long to appear after the page loads.

### Observable outcomes

- [ ] `UnknownBlockRenderer` is the dispatcher's `default` branch and renders a labelled card with the block `type` and raw `content`, never throwing.
- [ ] **Capstone (fallback resilience):** given a notebook fixture mixing known block types and a synthetic unknown type (e.g. `"future-block"` or an un-rendered `agent`/`notebook-function`), the known blocks render normally and the unknown block renders the labelled raw-content fallback — the surrounding notebook view does NOT throw or blank.
- [ ] **Capstone (full coverage — R3):** a fixture project containing EVERY in-scope block type (code, sql, markdown, all 7 text-cell kinds, visualization, all 8 input kinds, button, big-number, image, separator) renders with no block falling through to an error — the full per-block-type matrix.
- [ ] **Capstone (R7 graded — split a):** shell-to-render against an ALREADY-RUNNING server — browser hitting the running server → fully rendered ~20-block notebook — is measured and recorded as well inside the budget (kernel-free path); the cold `deepnote serve`-to-render (split b, server boot + interpreter) is reported but bounded by s1, not graded.
- [ ] DOM `IOutput` coverage (stream/display_data/execute_result/error) is verified end-to-end via the full-coverage fixture (R4).
- [ ] `apps/studio/README.md` completes the block-type coverage matrix and documents the unknown-type policy.

## Acceptance Criteria

- [ ] Unknown/unsupported types render the labelled fallback without crashing the view (R5).
- [ ] The full-coverage fixture renders every in-scope block type (R3); DOM IOutput coverage verified (R4).
- [ ] Time-to-first-render (R7): shell-to-render against an already-running server is well inside budget (graded — split a); cold `deepnote serve`-to-render reported, s1-gated (split b).

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/blocks/UnknownBlockRenderer.tsx` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | full-coverage fixture stands in |
| **Accessibility Report** | Fallback card labelled; Biome a11y passes |
| **Browser Test Matrix** | full-coverage fixture on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | R7 split-a: shell-to-render vs already-running server (graded); split-b reported |
| **Design Sign-off** | design doc Phase 8 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Yes — README coverage matrix + unknown-type policy. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Labelled fallback card. |
| **Performance Issues?** | R7 split-a recorded; split-b s1-gated. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 8 + KD6.)
* [ ] Component structure follows project architecture and design system. (default-branch fallback.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (fallback + mixed + full-coverage.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (R7 split-a graded.)
* [ ] Designer/UX team reviewed and approved final implementation. (design doc.)
* [ ] Component documentation updated (Storybook, component library). (README matrix.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (full-coverage fixture renders; R7 met.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.