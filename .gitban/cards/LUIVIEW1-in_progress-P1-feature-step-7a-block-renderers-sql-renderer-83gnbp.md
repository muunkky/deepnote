# step 7A: block-renderers SQL renderer

> **Design Phase 6** (`docs/designs/m3-s2-viewer.md` ~lines 638–663). Sprint **LUIVIEW1** step 7A — part of the parallel batch (7A/7B/7C/7D). SQL blocks render their query and their persisted result table. Depends on **step 6** (OutputRenderer/MIME registry). **Additive registration:** this renderer lives in its own file (`SqlRenderer.tsx`) and registers a `sql` entry **additively** into the `BlockRenderer` registry — merges with the other 7x cards are keep-both.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `sql-renderer`; sprint LUIVIEW1 step 7A
* **Feature Area/Component:** `apps/studio/src/blocks/SqlRenderer.tsx`
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
| **README.md** | `apps/studio/README.md` | Inline only |
| **Architecture Docs** | ADR-006 | Additive registry entry; result table flows through the MIME registry |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 6 (~638–663) | SqlRenderer deliverable + test strategy |
| **Similar Features** | step 6 OutputRenderer (`k61ziu`) | The persisted result table renders via OutputRenderer |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 6 | `docs/designs/m3-s2-viewer.md` ~638–663 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (Output/MIME) | `docs/designs/m3-s2-viewer.md` ~352–388 | The persisted result table flows through `OutputRenderer` + MIME registry |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | `sql` block shape + `block.outputs` |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/blocks/SqlRenderer.tsx` — renders `block.content` (the SQL, syntax-highlighted) and the persisted result via `<OutputRenderer outputs={block.outputs ?? []}>` (the result table is typically a persisted `text/html`/`text/plain` output, so it flows through the MIME registry).
* Deliverable: an **additive** registry entry for `sql` (own file; keep-both merge with sibling 7x cards).
* Constraint (R8): no run control, no editable query.

### Acceptance Criteria

- [x] SQL blocks render query + persisted result table; tests pass against the fixture.
- [x] A SQL block with no persisted output renders the query alone.
- [x] Read-only assertion: no run control, no editable query (R8).
- [x] `sql` registered additively (own file) into the BlockRenderer registry.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 6 | - [x] Design Complete |
| **Test Plan Creation** | query + result-table component test; no-output case; read-only | - [x] Test Plan Approved |
| **TDD Implementation** | SqlRenderer + additive `sql` registry entry | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [x] Integration Tests Pass |
| **Documentation** | Inline | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | fixture SQL block renders query text + persisted result table (HTML via MIME registry); no-output block renders query alone; read-only assertion | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | SqlRenderer + additive registry entry | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. **Additive registration:** the `sql` entry is added in `SqlRenderer.tsx`'s own registration, so a merge with 7B/7C/7D is keep-both (no contested registry edit).

**Key Implementation Decisions:** The result table renders via `OutputRenderer` (step 6), not a bespoke table renderer.

## Definition of Done

**Intent (plain English):** A SQL cell shows the query you wrote, syntax-highlighted, and underneath it the table of results that was last saved with the notebook — exactly as it would have looked when the query last ran. If there's no saved result, you just see the query. Nothing re-runs and nothing is editable.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** a `sql` block from the fixture renders its query text **and** its persisted result output (the result table, via `OutputRenderer`/MIME registry) — assert both appear in real DOM.
- [x] A SQL block whose `outputs` is empty renders the query alone (no crash, no empty table).
- [x] Read-only (R8): no run control, no editable query field.
- [x] `sql` is registered additively from `SqlRenderer.tsx` (own file) into the registry.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | query + result render from fixture |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | None |

### Completion Checklist

* [ ] All acceptance criteria are met and verified.
* [ ] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
* [ ] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Executor Close-out (LUIVIEW1 step 7A)

**Shipped (commit `e761ad1` on the worktree branch; completion tag `LUIVIEW1-83gnbp-done`):**

- `apps/studio/src/blocks/SqlRenderer.tsx` — read-only `sql` block renderer. Highlights the
  SQL query from `block.content` via highlight.js (explicit `sql` grammar with a `highlightAuto`
  fallback when the grammar is absent; highlight.js escapes the source while tokenising, so only
  its own safe token spans reach the DOM). The persisted result table is routed through the
  shared `OutputRenderer` (step 6) — NOT a bespoke table component — so a `text/html` result
  flows through the rich-first MIME registry and is sanitized at the existing MIME seam. No run
  control, no editable field (R8). Mirrors the `CodeRenderer` shape; reuses the same
  defensive `'outputs' in block` narrowing.
- `apps/studio/src/blocks/BlockRenderer.tsx` — **purely additive** registry edit: one import
  line + one `sql: SqlRenderer,` entry in `BLOCK_RENDERERS`. No reorder/reformat of sibling
  keys, no change to dispatch logic — keep-both mergeable with 7B/7C/7D.
- `apps/studio/src/blocks/SqlRenderer.test.tsx` — 7 TDD component tests (jsdom +
  @testing-library/react), written before the implementation.

**What the tests actually proved (real DOM, jsdom — not fixtures-on-disk):**

- Capstone: a `sql` block renders its query text **and** its persisted result — a `text/html`
  result bundle renders as a real `<table>` in the DOM via OutputRenderer/MIME registry, with
  rich-first precedence picking HTML over the co-present `text/plain`.
- A `sql` block with empty `outputs` renders the query alone — no `.output-renderer` region,
  no `<table>`, no crash.
- Read-only (R8): no `<button>`/role=button, no `<textarea>`/`<input>`/`contenteditable`.
- highlight.js emits `.hljs-*` token spans for SQL keywords.

Note: the result-table fixture is constructed inline in the test (an `execute_result` carrying a
`text/html` table bundle), exercising the live OutputRenderer → DataRenderer → MIME registry
path; it is not loaded from an on-disk project fixture.

**Verification run in-worktree (constrained env flags applied):**

- `vitest run src/blocks/SqlRenderer.test.tsx` → 7/7 pass.
- `vitest run src/blocks/` (full blocks suite, regression for the registry edit) → 42/42 pass.
- `tsc --noEmit -p apps/studio/tsconfig.json` → clean (exit 0).
- Isolation invariant: root `tsc -p tsconfig.json --listFilesOnly` names **0** `apps/` files.
- ADR-006/007 boundary: `IOutput`/`ApiProject` consumed **type-only** from
  `@deepnote/runtime-server/types`; no `node:` builtins; no runtime edge on `runtime-core`.
- `biome check --write` applied (import-order only) and re-tested green.

**cspell:** no new non-standard source vocabulary introduced (all terms standard English/code);
no `cspell.json` edit needed.

**Deferred / follow-ups:** none. Left in `in_progress` for the reviewer; Code Review / deploy /
monitoring / stakeholder / ticket-closed boxes intentionally unticked (reviewer + post-merge).