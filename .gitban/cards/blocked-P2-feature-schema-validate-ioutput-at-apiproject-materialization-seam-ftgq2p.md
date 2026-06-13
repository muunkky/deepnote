# Schema-validate persisted `block.outputs` (`IOutput[]`) at the `ApiProject` load seam

> **Origin:** LUIVIEW1 card k61ziu review 1, Sprint Retrospective Item 4 (non-blocking; failure mode is
> safe today). Makes the `IOutput[]` narrowing honest (validated) rather than asserted (cast).
> **Status:** BLOCKED on nothing external — the validation can be added at the existing `ApiProject`
> materialization seam. Deferred because the failure mode (a malformed persisted output renders as
> `null`) is safe today, just silent; this card surfaces it at the seam instead of dropping it downstream.

## Feature Overview & Context

* **Associated Ticket/Epic:** LUIVIEW1 retrospective Item 4 (m3/s2 read-only viewer SPA).
* **Feature Area/Component:** Project-load boundary where `ApiProject` is materialized (not the renderers).
* **Target Release/Milestone:** m3 local UI (fork-only); studio hardening sprint.

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
| **README.md** | `apps/studio/README.md` | Note the validated load boundary. |
| **Architecture Docs** | `docs/designs/m3-s2-viewer.md` | `ApiProject` load seam + `CodeRenderer` consumer. |
| **Similar Features** | `CodeRenderer` (`block.outputs as IOutput[]`) | Cast is reasonable + commented but unvalidated. |
| **API Specs** | s1 `GET /api/project` `ApiProject` payload | `outputs` typed `any[]` in the schema. |
| **ADR (New)** | **N/A** | No new ADR — adds a validation pass at an existing seam. |
| **Other Documentation** | Jupyter `IOutput` shape | `output_type` discriminant required for a valid output. |

## Design & Planning

### Initial Design Thoughts & Requirements

> Add a schema-validation pass for `IOutput[]` at the `ApiProject` materialization seam so the narrowing
> in `CodeRenderer` becomes validated rather than asserted, surfacing malformed persisted outputs (e.g.
> missing `output_type`) at the seam instead of silently dropping them downstream.

* Requirement: validate the persisted `block.outputs` shape at the load boundary against the `IOutput`
  contract (at minimum the `output_type` discriminant).
* Requirement: a malformed output is surfaced diagnostically at the seam, not indistinguishable from an
  absent output.
* Constraint: same safe end-state for valid data — no regression to the happy path.
* Design thought: validate once at materialization; `CodeRenderer` then narrows on validated data.

### Acceptance Criteria

* [ ] `block.outputs` is schema-validated against the `IOutput` contract at the `ApiProject` seam.
* [ ] A malformed persisted output (e.g. missing `output_type`) is surfaced diagnostically at the seam.
* [ ] `CodeRenderer`'s narrowing consumes validated data (the cast becomes honest).
* [ ] Valid projects render identically; `pnpm test` + `pnpm typecheck` green.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Validation pass at the `ApiProject` seam | - [ ] Design Complete |
| **Test Plan Creation** | Valid + malformed-output fixtures | - [ ] Test Plan Approved |
| **TDD Implementation** | Add the validation pass | - [ ] Implementation Complete |
| **Integration Testing** | `pnpm test` (studio suite) | - [ ] Integration Tests Pass |
| **Documentation** | README load-boundary note | - [ ] Documentation Complete |
| **Code Review** | gitban reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | N/A (fork-only) | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | Malformed-output fixture surfaces a diagnostic | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | Validation pass at the seam | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | studio suite green | - [ ] Originally failing tests now pass |
| **4. Refactor** | `CodeRenderer` narrows on validated data | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:**
Add a malformed-output fixture (missing `output_type`) and assert a diagnostic at the seam; assert valid
projects materialize unchanged.

**Key Implementation Decisions:**
Validate at the `ApiProject` materialization seam (the load boundary), not in the renderers.

```ts
// outputs validated against the IOutput contract before CodeRenderer narrows
const outputs = validateOutputs(block.outputs); // surfaces malformed outputs at the seam
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban reviewer |
| **QA Verification** | studio suite green; malformed-output diagnostic verified |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | Extend validation to other `any[]`-typed payload fields |
| **Technical Debt Created?** | No — this removes the asserted-cast debt |
| **Future Enhancements** | Shared schema validator for the whole `ApiProject` payload |

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
Blocked at sprint-closeout disposition: routed to backlog rather than done inline to keep the closeout clean. Adds a schema-validation pass for `IOutput[]` at the `ApiProject` materialization seam so `CodeRenderer`'s narrowing becomes validated rather than asserted, surfacing malformed persisted outputs at the seam instead of silently dropping them. The failure mode is safe today (malformed output renders as null), so this is non-blocking; no external prerequisite. Unblock to schedule into a studio hardening sprint. Source: LUIVIEW1 k61ziu review 1, retrospective Item 4 (non-blocking).
