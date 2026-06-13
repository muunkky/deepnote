# Reset dead engine after mid-run kernel death

**Source:** LUI1WEDGE closeout retrospective Item 3 (hlai4c review 1, L2). Filed as loose backlog (real behavioral session-lifecycle fix — needs its own review cycle, not a closeout inline fix). Design doc scoped this as a discrete P3 deliverable.

## Feature Overview & Context

* **Associated Ticket/Epic:** LUI1WEDGE card hlai4c (execute-stream-ws run queue).
* **Feature Area/Component:** `@deepnote/runtime-server` session lifecycle.
* **Target Release/Milestone:** m3 runtime-server (design-doc P3 deliverable).

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
| **README.md** | `packages/runtime-server/README.md` | document chosen recovery behavior |
| **Architecture Docs** | design doc P3 | flags this as a discrete deliverable with an explicit "or" |
| **Similar Features** | `close()` at `session.ts:285` | the only place `#engine` is cleared today |
| **API Specs** | n/a | n/a |
| **ADR (New)** | N/A | none required |
| **Other Documentation** | `session.ts:255` | sets `#engine`; never reset after `KernelDiedError` |

## Design & Planning

### Initial Design Thoughts & Requirements

> After a `KernelDiedError`, `#runTask` emits the terminal `run-failed` and `#drain` continues, but `session.#engine` is never set back to `null`. `startEngine()` is idempotent and returns early on a non-null engine, so the next enqueued run calls `runProject` on a dead engine. Today this degrades (repeated kernel-died terminals) rather than hangs — the DoD terminal-event guarantee still holds.

* Decision: auto-reset the engine (re-`start()` on next run) vs transition the session to an explicit fatal state.
* Requirement: test the second-run-after-death path.
* Failure mode today: every run after the first kernel death silently re-fails with `kernel-died` instead of attempting a fresh kernel.

### Acceptance Criteria

* [ ] After a mid-run `KernelDiedError`, the session either resets `#engine` (re-`start()` next run) OR transitions to an explicit surfaced fatal state.
* [ ] The decision (auto-reset vs fatal) is documented.
* [ ] The second-run-after-death path is covered by a test.
* [ ] The terminal-event guarantee (every run produces a terminal event) still holds.
* [ ] No run calls `runProject` on a known-dead engine without first attempting recovery (per chosen behavior).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | choose auto-reset vs fatal-state | - [ ] Design Complete |
| **Test Plan Creation** | second-run-after-death path | - [ ] Test Plan Approved |
| **TDD Implementation** | pending | - [ ] Implementation Complete |
| **Integration Testing** | pending | - [ ] Integration Tests Pass |
| **Documentation** | README recovery behavior | - [ ] Documentation Complete |
| **Code Review** | pending | - [ ] Code Review Approved |
| **Deployment Plan** | additive | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | run-after-death attempts fresh kernel (or surfaces fatal) | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | pending | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | pending | - [ ] Originally failing tests now pass |
| **4. Refactor** | pending | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | pending | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

> Files: `packages/runtime-server/src/session.ts`, `packages/runtime-server/src/run-queue.ts` (terminal-failure path), session/run-queue tests.

**Test Strategy:** simulate `KernelDiedError`, enqueue a second run, assert chosen recovery behavior.

**Key Implementation Decisions:** pending design choice.

```python
# on KernelDiedError terminal: reset #engine = null OR mark session fatal
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
| **Further Investigation?** | interaction with future multi-session |
| **Technical Debt Created?** | No |
| **Future Enhancements** | surfaced fatal-state UX |

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
