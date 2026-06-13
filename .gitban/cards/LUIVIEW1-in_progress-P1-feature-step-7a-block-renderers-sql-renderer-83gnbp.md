# step 7A: block-renderers SQL renderer

> **Design Phase 6** (`docs/designs/m3-s2-viewer.md` ~lines 638–663). Sprint **LUIVIEW1** step 7A — part of the parallel batch (7A/7B/7C/7D). SQL blocks render their query and their persisted result table. Depends on **step 6** (OutputRenderer/MIME registry). **Additive registration:** this renderer lives in its own file (`SqlRenderer.tsx`) and registers a `sql` entry **additively** into the `BlockRenderer` registry — merges with the other 7x cards are keep-both.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `sql-renderer`; sprint LUIVIEW1 step 7A
* **Feature Area/Component:** `apps/studio/src/blocks/SqlRenderer.tsx`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

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

* [ ] SQL blocks render query + persisted result table; tests pass against the fixture.
* [ ] A SQL block with no persisted output renders the query alone.
* [ ] Read-only assertion: no run control, no editable query (R8).
* [ ] `sql` registered additively (own file) into the BlockRenderer registry.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 6 | - [ ] Design Complete |
| **Test Plan Creation** | query + result-table component test; no-output case; read-only | - [ ] Test Plan Approved |
| **TDD Implementation** | SqlRenderer + additive `sql` registry entry | - [ ] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [ ] Integration Tests Pass |
| **Documentation** | Inline | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | fixture SQL block renders query text + persisted result table (HTML via MIME registry); no-output block renders query alone; read-only assertion | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | SqlRenderer + additive registry entry | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. **Additive registration:** the `sql` entry is added in `SqlRenderer.tsx`'s own registration, so a merge with 7B/7C/7D is keep-both (no contested registry edit).

**Key Implementation Decisions:** The result table renders via `OutputRenderer` (step 6), not a bespoke table renderer.

## Definition of Done

**Intent (plain English):** A SQL cell shows the query you wrote, syntax-highlighted, and underneath it the table of results that was last saved with the notebook — exactly as it would have looked when the query last ran. If there's no saved result, you just see the query. Nothing re-runs and nothing is editable.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** a `sql` block from the fixture renders its query text **and** its persisted result output (the result table, via `OutputRenderer`/MIME registry) — assert both appear in real DOM.
* [ ] A SQL block whose `outputs` is empty renders the query alone (no crash, no empty table).
* [ ] Read-only (R8): no run control, no editable query field.
* [ ] `sql` is registered additively from `SqlRenderer.tsx` (own file) into the registry.

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
