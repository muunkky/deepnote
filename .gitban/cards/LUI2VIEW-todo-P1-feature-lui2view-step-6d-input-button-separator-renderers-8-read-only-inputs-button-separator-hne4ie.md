# LUI2VIEW step 6D input-button-separator-renderers — 8 read-only inputs + button + separator

> **Sprint**: LUI2VIEW | **Step**: 6D (parallel batch with 6A/6B/6C) | **Roadmap**: `m3/s2/block-renderers/input-button-separator-renderers` | **Depends on**: step 3 (`rpbqkx` shell/dispatcher). Does not need the OutputRenderer (these blocks are not output-bearing).

> **Packed-card note (sprint-architect rule):** this card ships several independently-observable presentational renderers (8 input kinds + button + separator). They share fixture cost and the input-family file (`src/blocks/inputs/`) and are not independently shippable as separate roadmap features (the roadmap groups them as one), so they are packed. Per the packed-card rule the DoD below carries a PER-SUB-FEATURE capstone (one per input KIND, one for button, one for separator) — sharing fixtures is not a license to share capstones.

## UI Feature Overview

* **Feature Description:** Read-only renderers for the eight input kinds (text, textarea, checkbox, select, slider, date, date-range, file) each showing its current persisted value, plus button (label, non-firing) and separator (a horizontal rule).
* **UI Components:** `src/blocks/inputs/` (8 renderers), `src/blocks/ButtonRenderer.tsx`, `src/blocks/SeparatorRenderer.tsx`; registry entries for all 10 types.
* **User Story:** As a user, an input block shows its current value (the slider at its position, the select on its chosen option, the checkbox checked/unchecked, the date on its date, the file showing its filename), a button shows its label without doing anything when clicked, and a separator renders a rule.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 8 (lines ~706-751, the input/button/separator half).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** `createMarkdown`/separator + input metadata in `@deepnote/blocks`.
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 8 | `docs/designs/m3-s2-viewer.md` (Phase 8, lines ~706-751) | Deliverables, per-input-kind tests, button/separator tests, read-only assertion, DoD. |
| Input guards/metadata | `packages/blocks/src/blocks/input-blocks.ts` | `isInputTextBlock`/`isInputSliderBlock`/etc.; current value lives in `deepnote_variable_value`. |
| Button/separator helpers | `packages/blocks/src/blocks/button-blocks.ts`; `markdown.ts` | `isButtonBlock`; separator renders an `<hr>` (reuse `createMarkdown(block)` — NOT `createMarkdownForSeparatorBlock`, which does not exist). |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Input renderers** | Each of the 8 kinds shows its CURRENT persisted value from `deepnote_variable_value`, read-only — no interactive control that would mutate state. | R8 — slider shows value/position, select shows chosen option(s), checkbox its checked state, date its date, date-range its range, file its filename, text/textarea their text. |
| **Button** | Renders the button label, disabled/non-firing. | R8 read-only. |
| **Separator** | Renders a horizontal rule (`<hr>`) via `createMarkdown(block)`. | Reuse existing helper. |
| **Read-only** | No interactive/mutating control on any input; button does not fire. | R8 — read-only assertion is a test. |
| **Accessibility** | Inputs render with labels and read-only/disabled semantics; not just visual. | a11y from day one. |
| **Loading/Error States** | n/a (pure render of persisted block). | — |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 8 | - [ ] Renderers + read-only rule understood. |
| **Component Planning** | 8 inputs + button + separator + registry entries | - [ ] Components identified. |
| **Accessibility Plan** | labelled read-only inputs | - [ ] a11y plan noted. |
| **Component Development** | `src/blocks/inputs/`, `ButtonRenderer.tsx`, `SeparatorRenderer.tsx` | - [ ] Built. |
| **Component Testing** | per-input-kind + button + separator + read-only | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | render fixture blocks | - [ ] All render. |
| **UX Review** | values display correctly | - [ ] Looks right. |
| **Deployment** | fork dev branch | - [ ] Registry entries wired. |

## Component Implementation Workflow

TDD: write per-input-kind + button + separator + read-only tests first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | 8 input renderers + Button + Separator + registry entries | - [ ] Files created. |
| **2. Write Component Tests** | each input kind shows its current value read-only; button label + no-fire; separator rule; no mutating control | - [ ] Tests written first. |
| **3. Implement Component** | renderers + registry entries | - [ ] Satisfies tests. |
| **4. Style Component** | input/button/separator styling | - [ ] Legible. |
| **5. Add Accessibility** | labelled read-only inputs | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | view a fixture inputs notebook | - [ ] Verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

Registry wiring is additive (entries for the 8 `input-*` types + `button` + `separator`) so 6A/6B/6C/6D do not conflict. Inputs are presentational only — render the value, never wire an onChange that mutates project state.

## Definition of Done

### Intent

A user viewing a notebook sees each input block displaying the value it currently holds — a slider sitting at its value, a select showing the chosen option, a checkbox in its checked state, a date showing its date, a file input naming its file — plus any buttons (showing their label but doing nothing) and separators (as rules). Nothing is interactive in a way that changes the project. If this breaks, a user would notice an input showing a blank/default instead of its saved value, a button that actually fires, or an input they can edit.

### Observable outcomes

- [ ] Eight input renderers exist under `src/blocks/inputs/`, plus `ButtonRenderer.tsx` and `SeparatorRenderer.tsx`; registry entries for all 10 types are wired into `BlockRenderer`.
- [ ] **Capstone (inputs — per kind):** given a fixture with all eight input kinds carrying distinct `deepnote_variable_value`s, each renders its CURRENT value read-only — text/textarea show their text; checkbox shows its checked state; select shows the chosen option(s); slider shows its value/position; date shows its date; date-range shows its range; file shows its filename — and none exposes a control that mutates state. (One assertion per kind.)
- [ ] **Capstone (button):** given a fixture button block, the renderer shows its label and clicking it does NOT fire any action or mutate state.
- [ ] **Capstone (separator):** given a fixture separator block, the renderer shows a horizontal rule.
- [ ] Read-only assertion test confirms no input/button exposes a mutating control (R8).

## Acceptance Criteria

- [ ] All eight input kinds, button, and separator render their persisted state read-only; tests pass.
- [ ] No input exposes a mutating control; the button does not fire (R8).
- [ ] Registry entries for all 10 types are wired into `BlockRenderer`.

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/blocks/inputs/`, `ButtonRenderer.tsx`, `SeparatorRenderer.tsx` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Labelled read-only inputs; Biome a11y passes |
| **Browser Test Matrix** | render fixture on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | n/a (graded at step 7) |
| **Design Sign-off** | design doc Phase 8 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Inline; coverage matrix at step 7. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Read-only/disabled input semantics. |
| **Performance Issues?** | None this card. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 8.)
* [ ] Component structure follows project architecture and design system. (registry entries.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (per-kind + button + separator + read-only.)
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