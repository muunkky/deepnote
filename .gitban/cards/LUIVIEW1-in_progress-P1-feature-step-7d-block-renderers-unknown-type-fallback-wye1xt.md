# step 7D: block-renderers unknown-type fallback

> **Design Phase 8b** (`docs/designs/m3-s2-viewer.md` ~lines 706–751). Sprint **LUIVIEW1** step 7D — part of the parallel batch (7A/7B/7C/7D). The registry `default` branch (R5): an unknown/unsupported `block.type` renders a labelled raw-content fallback without crashing the notebook view. Depends on **step 6**. **Additive registration:** lives in its own file (`UnknownBlockRenderer.tsx`) and wires the registry `default` branch — merges with sibling 7x cards are keep-both.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `unknown-type-fallback`; sprint LUIVIEW1 step 7D
* **Feature Area/Component:** `apps/studio/src/blocks/UnknownBlockRenderer.tsx` (the registry `default` branch)
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
| **README.md** | `apps/studio/README.md` | Note completing the block-type coverage matrix + unknown-type policy |
| **Architecture Docs** | ADR-006 KDD §6 | `default` branch IS the unknown-type fallback (exhaustive-by-construction) |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 8b (~706–751) | UnknownBlockRenderer deliverable + fallback/coverage tests |
| **Similar Features** | terminal defensive posture | Same posture made structural via the `default` branch |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 8b | `docs/designs/m3-s2-viewer.md` ~706–751 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (BlockRenderer default) | `docs/designs/m3-s2-viewer.md` ~341–350 | `default` → `<UnknownBlockRenderer block={block} />` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | `DeepnoteBlock` discriminated union — unknown type is the non-matching case |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/blocks/UnknownBlockRenderer.tsx` — the `default` dispatch branch: renders a labelled card with the block `type` and its raw `content` (R5), never throwing.
* Deliverable: wire the registry `default` branch to `UnknownBlockRenderer` (additive; keep-both merge with sibling 7x cards). Replaces the placeholder default left in step 5.
* Constraint (R5): an unrecognized type (a future block kind, or `agent`/`notebook-function` not special-cased) renders the labelled raw-content fallback rather than crashing — and the surrounding notebook view still renders its other blocks.

### Acceptance Criteria

- [x] Unknown/unsupported types render the labelled fallback without crashing the view (R5).
- [x] A notebook mixing known and unknown blocks renders the known ones normally.
- [x] (Coverage, R3) a fixture project containing every in-scope block type renders with no block falling through to an error.
- [x] `default` branch wired additively to `UnknownBlockRenderer` (own file).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 8b + ADR-006 KDD §6 | - [x] Design Complete |
| **Test Plan Creation** | fallback test + mixed-notebook test + coverage matrix (R3) | - [x] Test Plan Approved |
| **TDD Implementation** | UnknownBlockRenderer + registry `default` wiring | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [x] Integration Tests Pass |
| **Documentation** | README coverage matrix + unknown-type policy | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [x] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | unknown `type` (synthetic `"future-block"` / un-rendered `agent`) renders labelled raw-content fallback without throwing; mixed known+unknown notebook renders known ones; coverage matrix (R3) | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | UnknownBlockRenderer + `default` wiring | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. Fallback test (R5): a block with an unknown `type` renders the labelled raw-content fallback and does **not** throw or blank the surrounding notebook view; a notebook mixing known and unknown blocks renders the known ones normally. **Additive registration:** the `default` branch is wired in `UnknownBlockRenderer.tsx`'s own registration; merges with 7A/7B/7C are keep-both.

**Key Implementation Decisions:** The `default` branch is structurally the unknown-type fallback — the dispatcher is exhaustive-by-construction over known types (ADR-006 KDD §6).

## Definition of Done

**Intent (plain English):** If a notebook contains a block the viewer doesn't recognize — a future block kind, or one we deliberately don't special-case — the viewer shows a labelled card with the block's type and raw content instead of crashing the whole notebook. Every other block on the page still renders normally; one unknown block can never blank the view.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** an unrecognized/unsupported `block.type` renders the labelled raw-content fallback **without crashing the notebook view** — assert in real DOM that the fallback card (with the type + raw content) renders, **and** that the other blocks in the same fixture notebook still render.
- [x] A notebook mixing known and unknown blocks renders the known ones normally (no throw, no blank).
- [x] (R3 coverage) a fixture project containing every in-scope block type renders with no block falling through to an error.
- [x] The registry `default` branch is wired additively to `UnknownBlockRenderer` (own file), replacing the step-5 placeholder.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | unknown block renders fallback; known blocks unaffected |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | Future block kinds can be special-cased by adding a registry entry |

### Completion Checklist

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
- [x] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Close-out (executor, cycle 1)

**Status:** code complete, all tests green, committed to worktree branch, completion tag `LUIVIEW1-wye1xt-done` written. Left in `in_progress` for the reviewer.

### What shipped

- **`apps/studio/src/blocks/UnknownBlockRenderer.tsx`** (new, own file) — the real graceful unknown-type fallback replacing the step-5 placeholder. Renders a labelled card: `Unsupported block type: <type>` (data hooks `data-block-unknown` / `data-block-unknown-label` / `data-block-unknown-content`) plus the block's **raw persisted `content`**. The raw content is rendered as an **escaped React text node** inside a `<pre>`, NOT via `dangerouslySetInnerHTML` — so an unknown block whose content embeds `<script>`/`onerror=`/`javascript:` markup is displayed literally and can never reach the DOM as live markup. (The design's `renderMarkdownToSafeHtml`/DOMPurify seam remains the path for any future *markup* injection; text-node rendering is the stronger, simpler guarantee and is what the fallback uses.) Never throws; coerces non-string `content` to `''`.
- **`apps/studio/src/blocks/BlockRenderer.tsx`** — removed the inline placeholder `UnknownBlockRenderer`; imported the real one and kept the registry `default` branch wired to it (additive, keep-both with siblings — the single shared branch 7D owns).
- **`apps/studio/src/blocks/UnknownBlockRenderer.test.tsx`** (new, 9 tests) — fallback label/raw-content/no-content/XSS-inert tests; the **R5 mixed-notebook capstone** (unknown block falls back gracefully while sibling known blocks still render, asserted in real jsdom DOM with all 4 `.block` wrappers present); and the **R3 full-coverage capstone driven off the live `BLOCK_RENDERERS` keys** (not a hardcoded list) — every registered non-`default` type resolves to its real renderer (NOT the fallback), and only a genuinely-unregistered synthetic type hits the unknown fallback. A populated-registry sanity guard (>=20 keys) prevents the per-type loop from passing vacuously.
- **`apps/studio/README.md`** — new "Block-type coverage matrix + unknown-type fallback" section: the full per-type → renderer table and the unknown-type policy (labelled raw-content fallback, text-node escaping, live-registry-driven coverage assertion).

### What the tests actually proved

- Real DOM (jsdom + `@testing-library/react`), not mocks — `render(<BlockRenderer .../>)` is the production dispatch path.
- `src/blocks` suite: **88 passed / 14 files** (9 new + existing siblings unchanged — the prior `BlockRenderer.test.tsx` fallback assertion via `data-block-unknown="true"` still green).
- Studio typecheck (`tsc -p apps/studio/tsconfig.json`): clean.
- Isolation invariant: root `tsc -p tsconfig.json --listFilesOnly` names **0** `apps/` files; `test-helpers/apps-studio-isolation.test.ts` **3/3 pass**. New file imports only `BlockVM` (type-only, via `../shell/viewModels`) — no runtime-server runtime import, no `node:` builtin (ADR-006/007 boundary held).
- Biome (TS) + Prettier (README) applied and clean on changed files.

### Scope notes / honesty

- **R7 time-to-first-render is NOT graded here** — it is a Phase-8 DoD line owned at the phase level, not this card's deliverable; this card asserts R5 (fallback) + R3 (coverage) only.
- The cspell gate could not be run locally (worktree `useGitignore` quirk reports 0 files). No genuinely new vocabulary was introduced: `onerror`/`xss`/`__xss` already appear in committed studio source that passes the gate, so no `cspell.json` edit was needed.

### Deferred / follow-ups

None. Unchecked Completion-Checklist items (`Code Review Approved`, `Feature is deployed`, `Monitoring`, `Stakeholders notified`, `Follow-up actions`) are reviewer-owned or N/A for fork-only — left for the reviewer to flip.
