# LUI2VIEW step 5 ioutput-mime-renderer — DOM IOutput dispatch + rich-first MIME registry

> **Sprint**: LUI2VIEW | **Step**: 5 | **Roadmap**: `m3/s2/block-renderers/ioutput-mime-renderer` | **Depends on**: step 2 (`o572iu` scaffold + DOM-env vitest project). **Lands BEFORE the output-bearing renderers (6A code, 6B sql, 6C viz) because they embed `<OutputRenderer>`.** (Roadmap lists this feature at sequence 5, but the design doc Roadmap-Connection note makes it a build dependency of the sequence-1 code renderer's output path.)

## UI Feature Overview

* **Feature Description:** The browser counterpart to the terminal `output-renderer.ts` — `IOutput[]` renders to the DOM via a rendermime-style MIME→renderer dispatch, shared by every output-bearing block renderer. Inverts the terminal's `text/plain`-first precedence to prefer the RICHEST renderable bundle.
* **UI Components:** `src/outputs/OutputRenderer.tsx` (dispatch on `output_type`), `StreamRenderer.tsx`, `ErrorRenderer.tsx`, `DataRenderer.tsx`, `src/outputs/mime/registry.ts` + per-MIME renderers (HTML/image/markdown/plain).
* **User Story:** As a user, a code/sql/viz block's persisted outputs render as rich DOM — dataframe HTML tables, images, ANSI error tracebacks — exactly the rich content the terminal had to drop.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 5 (lines ~598-634) + Architecture "Output rendering" (lines ~209-223) + Key Design Decisions 1 (precedence) + 2 (sanitization) + Interface Design (lines ~352-388, incl. M2 `data: unknown`).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** terminal reference `packages/cli/src/output-renderer.ts`; consumed by steps 6A/6B/6C.
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 5 | `docs/designs/m3-s2-viewer.md` (Phase 5, lines ~598-634) | Deliverables, per-output-type tests, precedence/sanitization/parity tests, DoD. |
| Design KD1/KD2 + Interface | `docs/designs/m3-s2-viewer.md` (lines ~229-244, ~352-388) | Rich-first precedence; sanitize HTML/SVG; `MimeRenderer = FC<{ data: unknown }>` (M2); `MIME_PRECEDENCE` order. |
| Terminal reference | `packages/cli/src/output-renderer.ts` (whole file) | `renderOutput(output)` dispatches on `output.output_type` (stream/display_data/execute_result/error); prefers `text/plain`, drops HTML/images — the DOM renderer mirrors the dispatch and INVERTS the precedence. |
| `IOutput` types | `packages/runtime-core/src/index.ts` (line 2) | `IOutput`/`IStream`/`IError`/`IDisplayData`/`IExecuteResult` re-exported (type-only) from `@deepnote/runtime-core` via `@jupyterlab/nbformat`. |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `OutputRenderer({ outputs: IOutput[] })` dispatches per output: `stream → StreamRenderer`, `display_data \| execute_result → DataRenderer`, `error → ErrorRenderer` — SAME dispatch shape as `renderOutput`. | Keeps terminal + DOM renderers conceptually paired (R4). |
| **MIME precedence** | Data-driven precedence map (rich-first): `text/html` > image (png/jpeg/svg) > vega/vega-lite/plotly JSON > `text/markdown` > `text/plain` (ANSI last resort). `pickRenderer(data)` returns first match. | KD1 — inverts terminal; data-driven so P3 can add renderers as registry entries, not switch edits. |
| **Sanitization** | `text/html` (dataframe tables) and `image/svg+xml` pass through a DOMPurify-class sanitizer before `dangerouslySetInnerHTML`. | KD2 — unsanitized injection is a defect, not an accepted risk, even on localhost. |
| **Renderer signature** | `MimeRenderer = FC<{ data: unknown }>`; each renderer narrows internally (vega/plotly carry a parsed JSON object, not a string). | M2 — `string \| string[]` would not type-check the JSON-bundle renderers. |
| **Error/stream styling** | `error` renders ename/evalue + ANSI traceback; `stream` renders text with stderr styling. | Mirrors terminal error/stream paths. |
| **Accessibility** | Output regions labelled; error output distinguishable beyond color. | a11y from day one. |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 5 | - [ ] Dispatch + precedence + sanitization understood. |
| **Component Planning** | OutputRenderer + Stream/Error/Data + registry | - [ ] Components identified. |
| **Accessibility Plan** | labelled output regions | - [ ] a11y plan noted. |
| **Component Development** | `src/outputs/**` | - [ ] Built. |
| **Component Testing** | per-output-type + precedence + sanitization + parity-of-shape | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | render fixture IOutputs | - [ ] Rich outputs render. |
| **UX Review** | tables/images/tracebacks read correctly | - [ ] Rich-first visible. |
| **Deployment** | fork dev branch | - [ ] Shared by 6A/6B/6C. |

## Component Implementation Workflow

TDD: write per-output-type + precedence + sanitization + parity tests against fixture `IOutput`s first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | `OutputRenderer.tsx`, `StreamRenderer.tsx`, `ErrorRenderer.tsx`, `DataRenderer.tsx`, `mime/registry.ts` | - [ ] Files created. |
| **2. Write Component Tests** | stream/error/data render; html-over-plain precedence; sanitization; 4-type parity | - [ ] Tests written first. |
| **3. Implement Component** | dispatch + registry + sanitizer | - [ ] Satisfies tests. |
| **4. Style Component** | table/image/traceback styling | - [ ] Legible. |
| **5. Add Accessibility** | labelled regions; stderr not color-only | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | render a fixture with html+image+error outputs | - [ ] Verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

Fixtures should be the SAME shape `run` produces (real Jupyter `IOutput`s). The registry is data-driven (`MIME_PRECEDENCE` array + `MIME_REGISTRY` map + `pickRenderer`), so native vega/plotly (step 6C) is an additive registry entry, not a rework. ANSI handling lives in the `text/plain` renderer (last resort), matching the terminal fallback.

## Definition of Done

### Intent

When a user views a notebook whose code/sql/viz blocks have persisted outputs, those outputs render as rich DOM — pandas dataframe HTML tables, PNG/JPEG/SVG images, and ANSI-colored error tracebacks — instead of the plain-text placeholders the terminal renderer had to emit. The renderer always shows the richest thing it can: an output carrying both HTML and plain text renders the HTML. If this breaks, a user would see a dataframe rendered as raw text, a missing image, or a traceback with no styling — or, worse, raw notebook HTML injected unsanitized. This renderer is shared by every output-bearing block renderer.

### Observable outcomes

- [ ] `OutputRenderer` dispatches each output on `output_type` to exactly the four paths `renderOutput` handles (`stream`, `display_data`, `execute_result`, `error`) — no fifth path and none silently dropped (parity-of-shape test).
- [ ] `stream` renders text with stderr styling; `error` renders ename/evalue + ANSI traceback; `display_data`/`execute_result` render via the MIME registry.
- [ ] **Precedence capstone:** a `display_data` bundle carrying BOTH `text/html` and `text/plain` renders the HTML table (rich-first), inverting the terminal renderer; a `text/plain`-only bundle renders the text.
- [ ] **Sanitization capstone:** a malicious `text/html` and a malicious `image/svg+xml` fixture (e.g. an embedded `<script>`/`onerror`) render sanitized — the script does not execute and no unsanitized markup is injected (assert the sanitized DOM, not a string match).
- [ ] HTML dataframe tables, images (png/jpeg/svg), and ANSI/error tracebacks all render in the DOM (R4).
- [ ] `apps/studio/README.md` notes this renderer's mapping to its terminal counterpart (`output-renderer.ts`) and the rich-first precedence rationale.

## Acceptance Criteria

- [ ] All four `output_type`s render in the DOM; parity-of-shape test passes.
- [ ] MIME precedence prefers the richest renderable bundle; `text/plain` is last resort.
- [ ] HTML/SVG are sanitized before injection; sanitization test passes.
- [ ] All output component tests pass against fixtures.

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/outputs/` (+ `outputs/mime/`) |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Output regions labelled; stderr not color-only |
| **Browser Test Matrix** | render fixture outputs on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | n/a (graded at step 7) |
| **Design Sign-off** | design doc Phase 5 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Yes — README terminal-counterpart + precedence note. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Labelled output regions. |
| **Performance Issues?** | None this card. |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 5.)
* [ ] Component structure follows project architecture and design system. (Architecture Output rendering.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (per-type + precedence + sanitization + parity.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (n/a; step 7.)
* [ ] Designer/UX team reviewed and approved final implementation. (design doc.)
* [ ] Component documentation updated (Storybook, component library). (README.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (shared by output-bearing renderers.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.