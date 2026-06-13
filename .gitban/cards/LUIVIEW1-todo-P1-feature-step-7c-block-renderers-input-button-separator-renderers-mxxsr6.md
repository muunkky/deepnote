# step 7C: block-renderers input / button / separator renderers

> **Design Phase 8a** (`docs/designs/m3-s2-viewer.md` ~lines 706–751). Sprint **LUIVIEW1** step 7C — part of the parallel batch (7A/7B/7C/7D). **PACKED CARD: 3 renderer groups** (input — eight kinds, button, separator). Depends on **step 6**. **Additive registration:** each renderer lives in its own file and registers its type **additively** into the `BlockRenderer` registry — merges with sibling 7x cards are keep-both. All read-only (R8).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `input-button-separator-renderers`; sprint LUIVIEW1 step 7C
* **Feature Area/Component:** `apps/studio/src/blocks/inputs/` (8 kinds), `ButtonRenderer.tsx`, `SeparatorRenderer.tsx`
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
| **Architecture Docs** | ADR-006 | Additive registry entries; read-only inputs (no interactivity) |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 8a (~706–751) | eight input kinds + button + separator deliverables |
| **Similar Features** | `createMarkdownForSeparatorBlock` (`<hr>`) | Reused for the separator |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 8a | `docs/designs/m3-s2-viewer.md` ~706–751 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (BlockRenderer) | `docs/designs/m3-s2-viewer.md` ~341–350 | Additive registry entries by `block.type` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | input/button/separator block shapes + `deepnote_variable_value` |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/blocks/inputs/` — eight read-only input renderers (text, textarea, checkbox, select, slider, date, date-range, file), each showing its **current persisted value** from `deepnote_variable_value` (no interactivity — read-only, R8): slider shows its value/position, select the chosen option(s), checkbox its checked state, date its date, file its filename.
* Deliverable: `ButtonRenderer.tsx` (renders the button label, disabled/non-firing — read-only).
* Deliverable: `SeparatorRenderer.tsx` (a horizontal rule — reuse `createMarkdownForSeparatorBlock`'s `<hr>`).
* Deliverable: **additive** registry entries for each type (own files; keep-both merge with sibling 7x cards).
* Constraint (R8): no interactive control that would mutate state; button does not fire on click.

### Acceptance Criteria

* [ ] All eight input kinds, button, and separator render their persisted state read-only; tests pass.
* [ ] Each input exposes no interactive control that would mutate state (R8).
* [ ] Button renders its label and does not fire on click; separator renders a rule.
* [ ] Each renderer registered additively (own file) into the registry.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 8a | - [ ] Design Complete |
| **Test Plan Creation** | per-input-kind + button + separator component tests | - [ ] Test Plan Approved |
| **TDD Implementation** | 8 inputs + Button + Separator + additive registry entries | - [ ] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [ ] Integration Tests Pass |
| **Documentation** | Inline | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | each input kind renders its current value read-only (no mutating control); button renders label + does not fire on click; separator renders a rule | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | 8 inputs + Button + Separator + additive registry entries | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first, one test per input kind asserting its persisted value renders read-only. **Additive registration:** each renderer registers its own type in its own file; merges with 7A/7B/7D are keep-both.

**Key Implementation Decisions:** Read-only (R8) — inputs show value but expose no state-mutating control; button is disabled/non-firing.

## Definition of Done

**Intent (plain English):** Every kind of interactive widget in a notebook — text boxes, checkboxes, dropdowns, sliders, date pickers, file pickers, buttons, and separators — shows its last-saved state, but you can't change it. A slider sits at its saved position, a checkbox shows whether it was checked, a button shows its label but does nothing when clicked, and a separator draws a line.

**Observable outcomes (unfakeable) — PER RENDERER:**

* [ ] **Capstone (input):** an input block renders its label + current persisted value from `deepnote_variable_value` (assert in real DOM, for the input kinds in the fixture), with no mutating control.
* [ ] **Capstone (button):** a `button` block renders its label (assert in real DOM) and does not fire on click.
* [ ] **Capstone (separator):** a `separator` block renders a divider/`<hr>` (assert the rule element in real DOM).
* [ ] All eight input kinds render their persisted value read-only (R8) — no control that would mutate state.
* [ ] Each of input/button/separator is registered additively from its own file into the registry.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | inputs/button/separator render from fixture read-only |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | Interactivity (binding inputs to execution) is P3/P4, out of scope |

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
