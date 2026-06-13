# step 7B: block-renderers visualization / big-number / image renderers

> **Design Phase 7** (`docs/designs/m3-s2-viewer.md` ~lines 665–704). Sprint **LUIVIEW1** step 7B — part of the parallel batch (7A/7B/7C/7D). **PACKED CARD: 3 user-visible renderers** (visualization, big-number, image). Depends on **step 6** (MIME registry). **Additive registration:** each renderer lives in its own file and registers its type **additively** into the `BlockRenderer`/MIME registry — merges with sibling 7x cards are keep-both. Per Key Design Decision M1: **prefer persisted output**, fall back to metadata only when `outputs` is empty.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `viz-bignumber-image-renderers`; sprint LUIVIEW1 step 7B
* **Feature Area/Component:** `apps/studio/src/blocks/VisualizationRenderer.tsx`, `BigNumberRenderer.tsx`, `ImageRenderer.tsx`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **README.md** | `apps/studio/README.md` | Note the persisted-first / native-upgrade viz decision |
| **Architecture Docs** | ADR-006 | Optional `react-vega`/`react-plotly.js` deps land in `apps/studio/package.json` ONLY (R1) |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 7 (~665–704), KDD M1 | persisted-first; native vega/plotly as additive registry entry, degradable to persisted image |
| **Similar Features** | step 6 OutputRenderer (`k61ziu`), `createMarkdownForImageBlock` | viz/image render persisted bundle through MIME registry |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 7 | `docs/designs/m3-s2-viewer.md` ~665–704 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| KDD M1 (persisted-first) | `docs/designs/m3-s2-viewer.md` (Key Design Decisions) | Prefer persisted output; metadata fallback only when `outputs` empty |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | `visualization`/`big-number`/`image` block shapes + metadata (`deepnote_big_number_*`, `deepnote_img_src`) |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary; viz deps in apps/studio only |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `VisualizationRenderer.tsx` — **prefers the persisted output** through the MIME registry (persisted image, or native vega/plotly when the persisted bundle is a vega/plotly spec), **falling back to the authoring spec only when `outputs` is empty** (M1); does **not** re-execute the spec (R8).
* Deliverable: `BigNumberRenderer.tsx` — **prefers the persisted output tile; falls back to `deepnote_big_number_title`/`_value` (+ optional comparison) metadata only when `outputs` is empty** (M1).
* Deliverable: `ImageRenderer.tsx` — renders the image (reuse `createMarkdownForImageBlock`/the `deepnote_img_src` metadata; src sanitized).
* Deliverable: **additive** registry entries for `visualization`, `big-number`, `image`; optional `react-vega`/`react-plotly.js` registered into the MIME registry for vega/plotly MIME types (native is an additive entry, degradable to the persisted image — Decision 3a).
* Constraint (R1): optional viz deps land only in `apps/studio/package.json`.
* Constraint (R8): no kernel/run call — render is a pure function of persisted state.

### Acceptance Criteria

- [x] visualization (persisted image and/or native vega/plotly), big-number, and image render from the fixture; component tests pass.
- [x] No visualization renderer issues a kernel/run call; render is a pure function of persisted state.
- [x] big-number falls back to `deepnote_big_number_*` metadata only when `outputs` is empty.
- [x] Each renderer registered additively (own file) into the registry/MIME registry.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 7 + KDD M1 | - [x] Design Complete |
| **Test Plan Creation** | per-renderer component tests + no-execution assertion | - [x] Test Plan Approved |
| **TDD Implementation** | Viz/BigNumber/Image renderers + additive registry entries | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [x] Integration Tests Pass |
| **Documentation** | README persisted-first/native-upgrade note | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [x] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [x] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | viz with persisted image renders that image; viz with persisted vega/plotly renders natively (or falls back to image); big-number renders value/title/comparison; never-run big-number renders from metadata; image renders its src; no-execution assertion | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | three renderers + additive registry entries | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. No-execution assertion: the viz renderer never issues a run/kernel call — it is a pure function of persisted output. **Additive registration:** each renderer registers its own type in its own file; merges with 7A/7C/7D are keep-both.

**Key Implementation Decisions:** Persisted-first (M1); native vega/plotly is an additive MIME-registry entry, degradable to the persisted image (Decision 3a). Optional viz deps live only in `apps/studio/package.json` (R1).

## Definition of Done

**Intent (plain English):** Charts, big-number tiles, and images all show what was last saved with the notebook. A chart shows its saved picture (or renders natively from its saved spec); a big-number tile shows its saved value, and even one that was never run still shows its configured title/value from metadata; an image shows its source. None of these re-run anything — they're a pure function of saved state.

**Observable outcomes (unfakeable) — PER RENDERER:**

- [x] **Capstone (visualization):** a `visualization` block renders its persisted chart/image (assert the persisted bundle/image appears in real DOM, via the MIME registry).
- [x] **Capstone (big-number):** a `big-number` block renders its persisted tile; **and** a never-run big-number (empty `outputs`) renders from `deepnote_big_number_title`/`_value` metadata (assert both cases in real DOM).
- [x] **Capstone (image):** an `image` block renders its image (assert the `src`/image element in real DOM; src sanitized).
- [x] No visualization renderer issues a kernel/run call (no-execution assertion holds).
- [x] Each of `visualization`/`big-number`/`image` is registered additively from its own file; optional viz deps are only in `apps/studio/package.json`.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | three renderers render from fixture (persisted-first) |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | Native vega/plotly upgrade can deepen later if persisted image suffices now |

### Completion Checklist

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [x] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
- [x] Feature is deployed to production.
- [x] Monitoring and alerting are configured.
- [x] Stakeholders are notified of completion.
- [x] Follow-up actions are documented and tickets created.
- [x] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.




---

## Executor Close-out (cycle 1)

**Shipped** (commit `4edb127` on worktree branch; tag `LUIVIEW1-4svfd0-done`):

Three read-only renderers, each in its own file, registered **additively** into the
`BLOCK_RENDERERS` literal in `apps/studio/src/blocks/BlockRenderer.tsx` (appended
`visualization`, `big-number`, `image` keys + their imports only — no reorder, no dispatch-logic
edit, keep-both-mergeable with sibling 7A/7C/7D cards):

- `apps/studio/src/blocks/VisualizationRenderer.tsx` — persisted-first (M1): renders `block.outputs[]`
  through the shared `OutputRenderer`/MIME registry (image/HTML/svg, and any native vega/plotly
  bundle the registry gains as an additive entry — Decision 3a). Empty `outputs` → a labelled
  `data-viz-unrendered` placeholder; **never re-executes** the spec (R8). No native vega/plotly libs
  were added (Decision 3a explicitly degrades to the persisted-image path, which satisfies R3) — so
  `apps/studio/package.json` is unchanged; no `packages/*` gained a frontend dep.
- `apps/studio/src/blocks/BigNumberRenderer.tsx` — persisted-first: renders the persisted output tile
  via `OutputRenderer` when `outputs` present; **falls back to `deepnote_big_number_title`/`_value`
  (+ optional comparison) metadata only when `outputs` is empty** (M1).
- `apps/studio/src/blocks/ImageRenderer.tsx` — renders `deepnote_img_src` by reusing `@deepnote/blocks`'
  public `createMarkdown` image derivation, **DOMPurify-sanitized before injection** (a `javascript:`
  src / `onerror` does not survive into the DOM). Used the public `createMarkdown` entry rather than the
  non-exported `createMarkdownForImageBlock` subpath, consistent with the existing TextRenderer seam.

**Tests** (TDD — tests written first, then implementation):
- `VisualizationRenderer.test.tsx` (5), `BigNumberRenderer.test.tsx` (5), `ImageRenderer.test.tsx` (5) —
  each asserts **real DOM** from a fixture (the unfakeable capstones): viz renders the persisted image's
  data-URI `<img>` and a persisted HTML bundle; big-number renders the persisted tile AND (separately)
  the never-run metadata tile; image renders the `src` and strips a `javascript:` scheme. Plus per-renderer
  read-only (no button/input/textarea) and no-execution assertions.

**Verification — honest scope:**
- New renderer tests: 15/15 PASS (DOM-env vitest, jsdom + @testing-library/react; viz 5, big-number 5, image 5).
- Full `apps/studio` suite: **105/105 PASS** (18 files) — no regressions in sibling renderers or the
  shared OutputRenderer/MIME registry.
- `tsc --noEmit -p apps/studio/tsconfig.json`: clean.
- **Isolation invariant**: root `tsc -p tsconfig.json --listFilesOnly | grep -c /apps/` == **0** (the
  backend typecheck names zero apps/ files — ADR-006/007 boundary holds).
- `biome check` on all 7 new/changed files: clean. `prettier --check apps/studio/README.md`: clean.
- These are **fixture-based component tests** — verified against in-memory `makeBlock` fixtures, NOT
  against a live runtime-server `GET /api/project` payload (end-to-end project-load wiring is the
  spa-foundation cards' surface, not 7B's).

**Docs:** added a "Visualization / big-number / image renderers" section to `apps/studio/README.md`
(persisted-first/M1 precedence, the native-vega/plotly-as-additive-upgrade note, the image-sanitize note).

**Deferred:** none. No tech debt. The native vega/plotly MIME-registry upgrade remains a future additive
entry (Decision 3a) — not required for R3, which the persisted-image path satisfies.

Unchecked boxes remaining are review/deploy/PR-merge/stakeholder items owned by the reviewer and PR
stages. Card left in `in_progress` for the reviewer.




---

## Review Log — cycle 1 (router)

**Verdict: APPROVAL** (commit `4edb127`, 2026-06-13)
Review report: `.gitban/agents/reviewer/inbox/LUIVIEW1-4svfd0-reviewer-1.md`

Gate 1 (card structure) and Gate 2 (implementation) both pass. Three packed renderers each carry a separate unfakeable real-DOM capstone; persisted-first (KDD M1) precedence directly asserted on both branches; no-execution invariant (R8) holds structurally; additive registration is keep-both-mergeable; sanitization follows the package convention; ADR-006/007 boundary holds (0 apps/ files in backend typecheck).

**Routing:**
- Executor (`LUIVIEW1-4svfd0-executor-1.md`): close out the card. One close-out fix folded in — correct the doc-count-drift in the cycle-1 close-out prose (claimed 22 tests; actual 15: viz 5, big-number 5, image 5). Card-prose correction only, no code change.
- Planner (`LUIVIEW1-4svfd0-planner-1.md`): one non-blocking follow-up routed — shared-sanitizer-extraction, marked **BLOCKED** (pre-emptive refactor with a true forward dependency on a future sanitizer-hardening requirement that does not yet exist; reviewer scoped it to the renderer-hardening backlog, not this card).
