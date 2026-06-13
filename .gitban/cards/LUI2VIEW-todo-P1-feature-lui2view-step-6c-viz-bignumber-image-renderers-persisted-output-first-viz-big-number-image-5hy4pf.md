# LUI2VIEW step 6C viz-bignumber-image-renderers — persisted-output-first viz, big-number, image

> **Sprint**: LUI2VIEW | **Step**: 6C (parallel batch with 6A/6B/6D) | **Roadmap**: `m3/s2/block-renderers/viz-bignumber-image-renderers` | **Depends on**: step 5 (`hch3tp` MIME registry — viz/big-number render persisted output through it) + step 3 (`rpbqkx` shell/dispatcher).

## UI Feature Overview

* **Feature Description:** Read-only renderers for visualization, big-number, and image blocks — the rich-visual surface where Cloud-likeness lives. Viz and big-number PREFER their persisted output (through the MIME registry), falling back to authoring metadata only when `outputs` is empty (M1). No re-execution (R8).
* **UI Components:** `src/blocks/VisualizationRenderer.tsx`, `BigNumberRenderer.tsx`, `ImageRenderer.tsx`; registry entries for `visualization`, `big-number`, `image`; optional `react-vega`/`react-plotly.js` registered into the MIME registry for vega/plotly MIME types.
* **User Story:** As a user, a chart that ran shows its rendered output, a big-number tile shows its computed value/title/comparison, and an image renders inline — none re-executed, all from persisted state.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 7 (lines ~665-702) + Key Design Decisions 3, 3a, and M1 (output-vs-metadata precedence, lines ~246-274).
* **Target Platforms:** Web (localhost), fork dev branch only.
* **Related Work:** step 5 MIME registry; `createMarkdown`/image metadata in `@deepnote/blocks`.
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 7 | `docs/designs/m3-s2-viewer.md` (Phase 7, lines ~665-702) | Deliverables, component tests, no-execution assertion, DoD. |
| Design KD3/3a/M1 | `docs/designs/m3-s2-viewer.md` (lines ~246-274) | Prefer persisted output; metadata fallback only when `outputs` empty; native vega/plotly is additive, can degrade to image without failing the phase. |
| Output renderer | step 5 `apps/studio/src/outputs/OutputRenderer.tsx` + `mime/registry.ts` | Persisted output (image or vega/plotly bundle) renders through the SAME registry; native vega/plotly is a registry entry. |
| Block guards/metadata | `packages/blocks/src/blocks/visualization-blocks.ts`, `big-number-blocks.ts`, `image-blocks.ts`; `markdown.ts` | `isVisualizationBlock`/`isBigNumberBlock`/`isImageBlock`; `deepnote_big_number_title`/`_value`/`_comparison_*`; `deepnote_img_src`; reuse `createMarkdown(block)` for the image path (NOT `createMarkdownForImageBlock` — that name does not exist). |

## Design & UX Review

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Visualization** | Prefer persisted output through the MIME registry (persisted image, OR native vega/plotly when the persisted bundle is a vega/plotly spec); fall back to the authoring spec only when `outputs` empty (M1). NEVER re-execute the spec. | KD3/3a/M1 + R8 — pure function of persisted state. |
| **Big-number** | Prefer the persisted output tile; fall back to `deepnote_big_number_title`/`_value` (+ optional comparison) metadata only when `outputs` empty (M1). | KD M1 — a run carries the actual computed value (ground truth); metadata is the pre-execution authoring spec. |
| **Image** | Render the image from `deepnote_img_src` metadata (reuse `createMarkdown(block)`); src sanitized. | Image is not output-bearing; src goes through the sanitizer (KD2 posture). |
| **Native vega/plotly** | Additive MIME-registry entry; if pulling the libs in proves heavier than the showcase warrants, degrade to the persisted image without failing the phase. | KD3a — data-driven registry makes this a one-line add/remove. |
| **No execution** | No kernel/run call from any renderer here. | R8 — no-execution assertion is a test. |
| **Accessibility** | Images have alt text; big-number tile is readable; charts have an accessible label. | a11y from day one. |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | design Phase 7 + KD3/3a/M1 | - [ ] Output-first precedence understood. |
| **Component Planning** | Viz/BigNumber/Image renderers + registry | - [ ] Components identified. |
| **Accessibility Plan** | alt text; chart labels | - [ ] a11y plan noted. |
| **Component Development** | `src/blocks/{Visualization,BigNumber,Image}Renderer.tsx` | - [ ] Built. |
| **Component Testing** | persisted-image viz; vega/plotly viz (or image fallback); big-number value; image src; no-execution | - [ ] Tests written first. |
| **Accessibility Testing** | Biome a11y green | - [ ] a11y passes. |
| **Responsive Testing** | n/a | - [ ] Deferred. |
| **Browser Testing** | render fixture blocks | - [ ] All render. |
| **UX Review** | charts/tiles/images read correctly | - [ ] Cloud-like. |
| **Deployment** | fork dev branch | - [ ] Registry entries wired. |

## Component Implementation Workflow

TDD: write the persisted-first, metadata-fallback, and no-execution tests first.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | 3 renderers + registry entries (+ optional vega/plotly deps in `apps/studio/package.json`) | - [ ] Files created. |
| **2. Write Component Tests** | viz persisted image; viz vega/plotly (or image fallback); big-number value/title/comparison; image src; metadata fallback when outputs empty; no kernel call | - [ ] Tests written first. |
| **3. Implement Component** | renderers + registry entries | - [ ] Satisfies tests. |
| **4. Style Component** | chart/tile/image styling | - [ ] Legible. |
| **5. Add Accessibility** | alt text; chart labels | - [ ] a11y added. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred. |
| **7. Manual Testing** | view a fixture viz/big-number/image notebook | - [ ] Verified by hand. |
| **8. Design QA** | n/a | - [ ] — |

#### Implementation Notes

Registry wiring is additive (entries for `visualization`/`big-number`/`image`) so 6A/6B/6C/6D do not conflict. Optional `react-vega`/`react-plotly.js` land in `apps/studio/package.json` ONLY (R1). If native vega/plotly is deferred, the persisted-image fallback satisfies R3 — the no-output-bundle path still renders the image (or, when a viz has never run, the authoring spec metadata, WITHOUT re-executing).

## Definition of Done

### Intent

A user viewing a notebook sees their charts as the rendered output they last produced (a chart image, or a native vega/plotly chart when the persisted bundle is a spec), their big-number tiles showing the actual computed value with title and comparison, and their images inline — none of it recomputed, all read straight from persisted state. A chart or tile that has never run falls back to its authoring metadata without executing anything. If this breaks, a user would see a chart re-rendered from a spec instead of the saved result, a big-number tile showing the authoring placeholder instead of the computed value, a broken image, or (worst) the viewer attempting a kernel call.

### Observable outcomes

- [ ] `VisualizationRenderer` renders the persisted output through the MIME registry (image, or native vega/plotly when the bundle is a spec), falling back to the authoring spec only when `outputs` is empty — never re-executing.
- [ ] `BigNumberRenderer` renders the persisted output tile, falling back to `deepnote_big_number_title`/`_value`(+comparison) metadata only when `outputs` is empty.
- [ ] `ImageRenderer` renders the image from `deepnote_img_src` (src sanitized).
- [ ] **Capstone (viz):** given a fixture viz block with a persisted image output it renders that image; given a viz block with a persisted vega/plotly bundle it renders the chart natively (OR, if native is deferred, falls back to the persisted image — KD3a); given a viz block with empty `outputs` it renders from the authoring spec WITHOUT issuing any kernel/run call.
- [ ] **Capstone (big-number):** given a big-number block that has run, it renders the persisted value tile; given one with empty `outputs`, it renders the `deepnote_big_number_*` metadata value/title/comparison.
- [ ] **Capstone (image):** given an image block, it renders the `deepnote_img_src` image (sanitized src).
- [ ] No-execution assertion: no renderer in this card issues a kernel/run call; render is a pure function of persisted state (R8).
- [ ] `apps/studio/README.md` notes the persisted-first / native-upgrade viz decision.

## Acceptance Criteria

- [ ] visualization (persisted image and/or native vega/plotly), big-number, and image render from the fixture; component tests pass.
- [ ] Output-vs-metadata precedence: persisted output preferred; metadata used only when `outputs` empty (M1).
- [ ] No visualization renderer issues a kernel/run call; render is a pure function of persisted state.

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/blocks/{Visualization,BigNumber,Image}Renderer.tsx` |
| **Storybook Stories** | n/a |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Image alt text; chart labels; Biome a11y passes |
| **Browser Test Matrix** | render fixture on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | n/a (graded at step 7) |
| **Design Sign-off** | design doc Phase 7 |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Yes — README persisted-first viz note. |
| **Design System Updates?** | No. |
| **Accessibility Improvements?** | Image alt text + chart labels. |
| **Performance Issues?** | Watch vega/plotly bundle weight (KD3a degrade path). |
| **Browser Compatibility Issues?** | Localhost evergreen. |
| **User Feedback?** | n/a. |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (design Phase 7 + KD3/3a/M1.)
* [ ] Component structure follows project architecture and design system. (output through MIME registry.)
* [ ] All components implemented matching design specifications.
* [ ] Component tests pass (unit, integration, visual regression). (persisted-first + metadata-fallback + no-execution.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (n/a; step 7.)
* [ ] Designer/UX team reviewed and approved final implementation. (design doc.)
* [ ] Component documentation updated (Storybook, component library). (README.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (renders from fixture.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.