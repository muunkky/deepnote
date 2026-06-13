# Widen slice-integrity gate to full contrib closure

**Source:** LUI1WEDGE closeout retrospective Item 10 (dx99dj review 1, L2). Filed as loose backlog.

## Feature Overview & Context

* **Associated Ticket/Epic:** LUI1WEDGE card dx99dj (contrib-diff cut + slice-integrity gate).
* **Feature Area/Component:** CI boundary enforcement — `packages/runtime-server/src/slice-integrity.test.ts` (ADR-007 §6 / M2 boundary).
* **Target Release/Milestone:** m3.

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
| **README.md** | `packages/runtime-server/README.md` | slice boundary intent |
| **Architecture Docs** | ADR-007 §6 Validation bullet 3 | the M1 madge/dependency-cruiser check "has not landed" |
| **Similar Features** | `no-cli-import.test.ts`, `api-types-no-runtime-import.test.ts` | AST-based boundary gates |
| **API Specs** | n/a | n/a |
| **ADR (New)** | N/A | none required |
| **Other Documentation** | `slice-integrity.test.ts` | scans only runtime-server/src + 3 cli serve-delta files |

## Design & Planning

### Initial Design Thoughts & Requirements

> The always-on slice-integrity gate scans only `runtime-server/src` plus the three CLI serve-delta files for the framework/`apps/` import edge. But the buildable contrib closure is wider — `blocks` + the full `runtime-core` + `runtime-server` + the cli serve delta. A frontend / `apps/` import planted in `runtime-core` or `blocks` would NOT be caught; it is only covered by the review-asserted one-way-dependency convention (ADR-007 Validation bullet 3 — the madge/dependency-cruiser check that has not landed).

* Option (a): widen the standing AST gate to scan the WHOLE slice closure (`runtime-server/src` + `runtime-core` + `blocks` + cli serve delta) for the framework/`apps/` edge — no new tooling (the gate uses the resolved TypeScript AST precisely because madge/depcruise are not installed).
* Option (b): land the deferred madge/dependency-cruiser boundary check as the enforced home for the `packages/ -> apps/` no-edge invariant — requires adding the madge/depcruise dev dependency.
* Recommendation: prefer the AST-widening option (a) unless the team wants madge/depcruise as the standing boundary tool.

### Acceptance Criteria

* [ ] The `packages/ -> apps/` (framework/`apps/`) no-edge invariant is enforced across the full contrib closure (`runtime-server` + `runtime-core` + `blocks` + cli serve delta), not just the serve delta.
* [ ] A planted `apps/`/framework import in `runtime-core` or `blocks` reds the gate.
* [ ] The gate runs in the always-on `pnpm test` job (no new CI job required for option a).
* [ ] If option (b) is chosen, the madge/depcruise config + CI step are wired and documented.
* [ ] ADR-007 Validation bullet 3 is updated to reflect the enforced home.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | choose option (a) vs (b) | - [ ] Design Complete |
| **Test Plan Creation** | planted-import negative test | - [ ] Test Plan Approved |
| **TDD Implementation** | pending | - [ ] Implementation Complete |
| **Integration Testing** | pending | - [ ] Integration Tests Pass |
| **Documentation** | ADR-007 update | - [ ] Documentation Complete |
| **Code Review** | pending | - [ ] Code Review Approved |
| **Deployment Plan** | CI-only | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | plant `apps/` import in runtime-core fixture; gate must red | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | widen AST scan (or wire madge/depcruise) | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | pending | - [ ] Originally failing tests now pass |
| **4. Refactor** | pending | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | pending | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

> Files: `packages/runtime-server/src/slice-integrity.test.ts` (widen the AST scan to the full closure), or a new madge/dependency-cruiser config under `packages/` + a CI step wiring the `packages/ -> apps/` no-edge check.

**Test Strategy:** negative assertion — a planted `apps/`/framework import anywhere in the closure must fail the gate.

**Key Implementation Decisions:** prefer AST widening (zero new tooling).

```python
# scan runtime-server/src + runtime-core + blocks + cli serve delta for the apps/ edge
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | pending |
| **QA Verification** | N/A |
| **Staging Deployment** | N/A |
| **Production Deployment** | N/A |
| **Monitoring Setup** | CI gate |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | madge/depcruise adoption decision |
| **Technical Debt Created?** | No |
| **Future Enhancements** | full dependency-graph boundary tooling |

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
