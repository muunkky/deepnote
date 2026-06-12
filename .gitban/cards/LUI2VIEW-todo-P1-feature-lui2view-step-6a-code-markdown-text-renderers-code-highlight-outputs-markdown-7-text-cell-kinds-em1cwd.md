# LUI2VIEW step 6A code-markdown-text-renderers — code (highlight+outputs), markdown, 7 text-cell kinds

> **Sprint**: LUI2VIEW | **Step**: 6A (parallel batch with 6B/6C/6D) | **Roadmap**: `m3/s2/block-renderers/code-markdown-text-renderers` | **Depends on**: step 5 (`hch3tp` OutputRenderer — code embeds it) + step 3 (`rpbqkx` shell/dispatcher).

## UI Feature Overview

* **Feature Description:** Read-only renderers for code blocks (syntax-highlighted source + persisted outputs via `OutputRenderer`), markdown blocks (formatted prose), and the seven `text-cell-*` kinds.
* **UI Components:** `src/blocks/CodeRenderer.tsx`, `MarkdownRenderer.tsx`, `TextRenderer.tsx`; registry entries wiring `code`, `markdown`, and the 7 `text-cell-*` types into `BlockRenderer`.
* **User Story:** As a user, code blocks show highlighted source with their last-saved outputs, markdown renders as prose, and headings/bullets/todos/callouts render with the right structure — none of it editable or runnable.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 4 (lines ~565-595) + Architecture per-type renderers (lines ~194-207).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** step 5 `OutputRenderer`; `createMarkdown` helper in `@deepnote/blocks`.
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 4 | `docs/designs/m3-s2-viewer.md` (Phase 4, lines ~565-595) | Deliverables, per-renderer tests, read-only assertion, DoD. |
| Blocks markdown helper | `packages/blocks/src/markdown.ts` | The REAL helper is `createMarkdown(block)` + `stripMarkdown(block)` (unified, keyed on `block.type`) — NOT `createMarkdownForTextBlock` (the design doc's anticipated name). Reuse `createMarkdown` for text-cell kinds rather than re-deriving. |
| Type guards | `packages/blocks/src/blocks/code-blocks.ts`, `text-blocks.ts` | `isCodeBlock` to narrow; the 7 text-cell kinds are `text-cell-{p,h1,h2,h3,bullet,todo,callout}`. |
| Output renderer | step 5 `apps/studio/src/outputs/OutputRenderer.tsx` | Code embeds `<OutputRenderer outputs={block.outputs ?? []}>`. |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `CodeRenderer` = highlighted `block.content` + `<OutputRenderer>`; `MarkdownRenderer` = `markdown` block content as prose; `TextRenderer` = the 7 `text-cell-*` kinds via `createMarkdown(block)`. | Pure read-only presentational components. |
| **Syntax highlighting** | A Shiki/Prism-class highlighter scoped to `apps/studio` only (renderer-internal pick). | Open Question — does not affect architecture; lands only in `apps/studio/package.json`. |
| **Read-only** | NO run control, NO editable field on any renderer. | R8 — read-only assertion is a test. |
| **Accessibility** | Headings render as real heading elements; code block has appropriate semantics. | a11y from day one. |
| **Loading/Error States** | n/a (pure render of persisted block). | — |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 4 | - [ ] Renderers + read-only rule understood. |
| **Component Planning** | Code/Markdown/Text renderers + registry entries | - [ ] Components identified. |
| **Accessibility Plan** | real heading elements | - [ ] a11y plan noted. |
| **Component Development** | `src/blocks/{Code,Markdown,Text}Renderer.tsx` | - [ ] Built. |
| **Component Testing** | per-renderer fixture tests + read-only assertion | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | render fixture blocks | - [ ] All render. |
| **UX Review** | prose/headings/code read correctly | - [ ] Looks right. |
| **Deployment** | fork dev branch | - [ ] Registry entries wired. |

## Component Implementation Workflow

TDD: write per-renderer fixture tests + the read-only assertion first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | 3 renderers + registry wiring | - [ ] Files created. |
| **2. Write Component Tests** | code highlights + shows output; markdown prose; each text-cell kind structure; no run/edit affordance | - [ ] Tests written first. |
| **3. Implement Component** | renderers + registry entries | - [ ] Satisfies tests. |
| **4. Style Component** | code/prose styling | - [ ] Legible. |
| **5. Add Accessibility** | heading semantics | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | view a fixture notebook | - [ ] Verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

Registry wiring is additive (one entry per type into the `Record<DeepnoteBlock['type'], FC>` registry) so 6A/6B/6C/6D do not conflict. If step 5 hasn't landed when this is picked up, stub `block.outputs` rendering and add the output assertion once `OutputRenderer` exists (design Phase 4 dependency note).

## Definition of Done

### Intent

A user viewing a notebook sees their code cells with syntax-highlighted source and the outputs they last saved, their markdown cells as formatted prose, and their text cells (paragraphs, the three heading levels, bullets, todos, callouts) with the right visual structure — all read-only, with nothing offering to run or edit. If this breaks, a user would see unhighlighted code, raw markdown source, a heading rendered as a paragraph, or an unexpected run/edit control appearing.

### Observable outcomes

- [ ] `CodeRenderer` renders syntax-highlighted source from `block.content` and embeds `<OutputRenderer outputs={block.outputs ?? []}>`.
- [ ] `MarkdownRenderer` renders a `markdown` block's content as formatted prose.
- [ ] **Capstone (code + output):** given a fixture code block with source and a persisted `display_data`/`execute_result` output, the renderer shows the highlighted source AND the rendered output, and exposes NO run control and NO editable field.
- [ ] **Capstone (text-cell coverage):** given fixture blocks of all seven `text-cell-*` kinds (p/h1/h2/h3/bullet/todo/callout), each renders its correct structure (h1/h2/h3 as heading elements, bullet as a list item, todo with its checkbox state, callout as a callout) via `createMarkdown(block)`.
- [ ] Read-only assertion test confirms no rendered code/text block exposes an edit or run affordance (R8).

## Acceptance Criteria

- [ ] code, markdown, and all seven text-cell kinds render from the fixture; component tests pass.
- [ ] Code blocks show persisted outputs and expose no edit/run affordance.
- [ ] Registry entries for `code`, `markdown`, and the 7 `text-cell-*` types are wired into `BlockRenderer`.

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/blocks/{Code,Markdown,Text}Renderer.tsx` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Heading semantics; Biome a11y passes |
| **Browser Test Matrix** | render fixture on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | n/a (graded at step 7) |
| **Design Sign-off** | design doc Phase 4 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Inline; coverage matrix completed at step 7. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Real heading elements. |
| **Performance Issues?** | None this card. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 4.)
* [ ] Component structure follows project architecture and design system. (per-type renderers.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (per-renderer + read-only.)
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