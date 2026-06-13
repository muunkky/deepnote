# Studio output CSS/theming layer — bind the dormant semantic class / `data-*` hooks

> **Origin:** LUIVIEW1 card k61ziu review 1, Sprint Retrospective Item 3 (non-blocking; the styling hooks
> must not be dropped). This card is the named home for the dormant output styling hooks.
> **Status:** BLOCKED on nothing external — the CSS layer can be authored now. Deferred to a dedicated
> theming card so the studio output styling surface is owned as a whole rather than partially bound in
> the renderer slice. "Note-only" is explicitly NOT acceptable for this work — the hooks cannot sit
> permanently dormant.

## Feature Overview & Context

* **Associated Ticket/Epic:** LUIVIEW1 retrospective Item 3 (m3/s2 read-only viewer SPA).
* **Feature Area/Component:** Studio output renderers' visual layer (CSS/theming).
* **Target Release/Milestone:** m3 local UI (fork-only); studio theming sprint.

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
| **README.md** | `apps/studio/README.md` | Document the output styling surface once bound. |
| **Architecture Docs** | `docs/designs/m3-s2-viewer.md` | IOutput renderer DOM contract (semantic classes + `data-*`). |
| **Similar Features** | `apps/studio/src/outputs/` renderers | Emit `output-stream--stderr`, `output-error`, `output-mime--html`, etc. — all currently unstyled. |
| **API Specs** | N/A | Visual-layer-only work. |
| **ADR (New)** | **N/A** | No new ADR — binds an existing DOM contract. |
| **Other Documentation** | Cloud Deepnote output styling | Reference for stderr/error visual distinction. |

## Design & Planning

### Initial Design Thoughts & Requirements

> Author the stylesheet/theming layer that binds the semantic class names and `data-*` hooks every
> IOutput renderer already emits, so the visual distinction (stderr colour, error red, MIME framing)
> becomes real instead of dormant.

* Requirement: bind `output-stream--stderr`, `output-error`, `output-mime--*` and the `data-*` hooks.
* Requirement: stderr visually distinguished (colour), errors visually distinguished (red), per the DOM
  contract that is already test-asserted.
* Constraint: no DOM-contract change — the class/`data-*` names are fixed; only the CSS binds them.
* Design thought: own the studio output styling surface as a whole (one stylesheet/theming module), not
  scattered per-renderer styles.

### Acceptance Criteria

* [ ] A stylesheet/theming layer binds the semantic class names and `data-*` hooks the IOutput renderers
  emit (no dormant hooks remain).
* [ ] stderr and error outputs are visually distinguished (e.g. stderr colour, error red).
* [ ] The DOM contract is unchanged; existing renderer tests stay green.
* [ ] `pnpm test` + `pnpm typecheck` + `pnpm lintAndFormat` green.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Output styling surface as one owned layer | - [ ] Design Complete |
| **Test Plan Creation** | Snapshot/contract tests for styled hooks | - [ ] Test Plan Approved |
| **TDD Implementation** | Author the stylesheet + bind hooks | - [ ] Implementation Complete |
| **Integration Testing** | `pnpm test` (studio suite) | - [ ] Integration Tests Pass |
| **Documentation** | README output styling note | - [ ] Documentation Complete |
| **Code Review** | gitban reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | N/A (fork-only) | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | Assert the styled hooks are bound | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | Author the stylesheet/theming layer | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | studio suite green | - [ ] Originally failing tests now pass |
| **4. Refactor** | Consolidate the styling surface | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:**
Keep the existing DOM-contract tests; add binding assertions / snapshots for the styled hooks.

**Key Implementation Decisions:**
One owned output-styling layer rather than per-renderer scattered CSS.

```css
/* binds the dormant hooks the renderers already emit */
.output-stream--stderr { color: var(--output-stderr); }
.output-error { color: var(--output-error); }
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban reviewer |
| **QA Verification** | studio suite green; visual distinction verified |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | Theming tokens / dark mode follow-up |
| **Technical Debt Created?** | No — this resolves the dormant-hooks debt |
| **Future Enhancements** | Theme tokens, dark mode |

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

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.


## BLOCKED
Blocked at sprint-closeout disposition: routed to backlog as the dedicated home for the dormant output styling hooks so the studio output styling surface is owned as a whole rather than partially bound in the renderer slice. The CSS layer has no external prerequisite and can be authored once scheduled. "Note-only" is explicitly not acceptable — the semantic class / `data-*` hooks must not sit permanently dormant. Unblock to schedule into a studio theming sprint. Source: LUIVIEW1 k61ziu review 1, retrospective Item 3 (non-blocking).
