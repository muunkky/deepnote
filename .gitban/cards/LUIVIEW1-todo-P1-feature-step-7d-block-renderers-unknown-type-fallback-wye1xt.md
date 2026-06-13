# step 7D: block-renderers unknown-type fallback

> **Design Phase 8b** (`docs/designs/m3-s2-viewer.md` ~lines 706–751). Sprint **LUIVIEW1** step 7D — part of the parallel batch (7A/7B/7C/7D). The registry `default` branch (R5): an unknown/unsupported `block.type` renders a labelled raw-content fallback without crashing the notebook view. Depends on **step 6**. **Additive registration:** lives in its own file (`UnknownBlockRenderer.tsx`) and wires the registry `default` branch — merges with sibling 7x cards are keep-both.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `unknown-type-fallback`; sprint LUIVIEW1 step 7D
* **Feature Area/Component:** `apps/studio/src/blocks/UnknownBlockRenderer.tsx` (the registry `default` branch)
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

* [ ] Unknown/unsupported types render the labelled fallback without crashing the view (R5).
* [ ] A notebook mixing known and unknown blocks renders the known ones normally.
* [ ] (Coverage, R3) a fixture project containing every in-scope block type renders with no block falling through to an error.
* [ ] `default` branch wired additively to `UnknownBlockRenderer` (own file).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 8b + ADR-006 KDD §6 | - [ ] Design Complete |
| **Test Plan Creation** | fallback test + mixed-notebook test + coverage matrix (R3) | - [ ] Test Plan Approved |
| **TDD Implementation** | UnknownBlockRenderer + registry `default` wiring | - [ ] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [ ] Integration Tests Pass |
| **Documentation** | README coverage matrix + unknown-type policy | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | unknown `type` (synthetic `"future-block"` / un-rendered `agent`) renders labelled raw-content fallback without throwing; mixed known+unknown notebook renders known ones; coverage matrix (R3) | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | UnknownBlockRenderer + `default` wiring | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. Fallback test (R5): a block with an unknown `type` renders the labelled raw-content fallback and does **not** throw or blank the surrounding notebook view; a notebook mixing known and unknown blocks renders the known ones normally. **Additive registration:** the `default` branch is wired in `UnknownBlockRenderer.tsx`'s own registration; merges with 7A/7B/7C are keep-both.

**Key Implementation Decisions:** The `default` branch is structurally the unknown-type fallback — the dispatcher is exhaustive-by-construction over known types (ADR-006 KDD §6).

## Definition of Done

**Intent (plain English):** If a notebook contains a block the viewer doesn't recognize — a future block kind, or one we deliberately don't special-case — the viewer shows a labelled card with the block's type and raw content instead of crashing the whole notebook. Every other block on the page still renders normally; one unknown block can never blank the view.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** an unrecognized/unsupported `block.type` renders the labelled raw-content fallback **without crashing the notebook view** — assert in real DOM that the fallback card (with the type + raw content) renders, **and** that the other blocks in the same fixture notebook still render.
* [ ] A notebook mixing known and unknown blocks renders the known ones normally (no throw, no blank).
* [ ] (R3 coverage) a fixture project containing every in-scope block type renders with no block falling through to an error.
* [ ] The registry `default` branch is wired additively to `UnknownBlockRenderer` (own file), replacing the step-5 placeholder.

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
