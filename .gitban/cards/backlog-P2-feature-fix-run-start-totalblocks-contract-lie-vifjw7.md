# Fix run-start.totalBlocks contract lie

**Source:** LUI1WEDGE closeout retrospective Item 2 (hlai4c review 1, L1). Filed as loose backlog (behavioral runtime-server change — needs its own review cycle, not a closeout inline fix).

## Feature Overview & Context

* **Associated Ticket/Epic:** LUI1WEDGE card hlai4c (execute-stream-ws run queue).
* **Feature Area/Component:** `@deepnote/runtime-server` run-queue WS contract.
* **Target Release/Milestone:** next runtime-server release (m3).

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
| **README.md** | `packages/runtime-server/README.md` | worked example shows `"totalBlocks": 3` — a value the code never produces |
| **Architecture Docs** | ADR-005 | run-serialization constraint |
| **Similar Features** | `block-start.total` | carries the real per-run count correctly |
| **API Specs** | `api-types.ts:109` | advertises `totalBlocks` field |
| **ADR (New)** | N/A | none required |
| **Other Documentation** | `run-queue.ts:231`, `run-queue.test.ts:78` | always emits `totalBlocks: 0`; test codifies `0` |

## Design & Planning

### Initial Design Thoughts & Requirements

> `run-queue.ts:231` always emits `{ type: 'run-start', runId, totalBlocks: 0 }`. A consumer branching on `run-start.totalBlocks` to size a progress UI gets `0` for every run, contradicting the documented `3`. The count is genuinely unknowable before `engine.runProject` is invoked.

* Requirement: README example must stop showing a value the code never produces.
* Option (a): drop `totalBlocks` from the `run-start` shape; update README/contract; defer count to `block-start.total`.
* Option (b): plumb the executable-block count out of the engine and emit it for real.
* Failure mode: downstream percent indicator stuck at 0% or divides by zero.

### Acceptance Criteria

* [ ] `run-start.totalBlocks` either carries a real count or is removed from the contract type.
* [ ] README worked example no longer shows a value the code never produces.
* [ ] `run-queue.test.ts` reflects the chosen contract (no `totalBlocks: 0` lie).
* [ ] `api-types.ts` contract type matches the emitted shape.
* [ ] No consumer can compute a divide-by-zero from `run-start.totalBlocks`.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | choose option (a) vs (b) | - [ ] Design Complete |
| **Test Plan Creation** | update run-queue tests | - [ ] Test Plan Approved |
| **TDD Implementation** | pending | - [ ] Implementation Complete |
| **Integration Testing** | pending | - [ ] Integration Tests Pass |
| **Documentation** | README + api-types | - [ ] Documentation Complete |
| **Code Review** | pending | - [ ] Code Review Approved |
| **Deployment Plan** | additive/breaking call | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | assert real count or removed field | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | pending | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | pending | - [ ] Originally failing tests now pass |
| **4. Refactor** | pending | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | pending | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

> Files: `packages/runtime-server/src/run-queue.ts`, `packages/runtime-server/src/api-types.ts`, `packages/runtime-server/README.md`, `packages/runtime-server/src/run-queue.test.ts`.

**Test Strategy:** assert the emitted `run-start` shape matches the contract type and README.

**Key Implementation Decisions:** prefer option (a) (drop the field) unless the engine count is cheaply plumbable.

```python
# run-start no longer advertises a count the code cannot produce
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | pending |
| **QA Verification** | pending |
| **Staging Deployment** | N/A |
| **Production Deployment** | N/A |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | engine count plumbing feasibility |
| **Technical Debt Created?** | No |
| **Future Enhancements** | real progress-percent UI |

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
