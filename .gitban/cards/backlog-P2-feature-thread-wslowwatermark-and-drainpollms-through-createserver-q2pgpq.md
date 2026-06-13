# Thread wsLowWaterMark and drainPollMs through createServer

**Source:** LUI1WEDGE closeout retrospective Item 4 (hlai4c review 1, L3). Filed as loose backlog (config-surface change to runtime-server — own review cycle; directive says config threading is backlog, not a closeout inline fix). Effort is P3-class but gitban caps at P2.

## Feature Overview & Context

* **Associated Ticket/Epic:** LUI1WEDGE card hlai4c (execute-stream-ws run queue).
* **Feature Area/Component:** `@deepnote/runtime-server` `createServer` config surface.
* **Target Release/Milestone:** m3 runtime-server.

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
| **README.md** | `packages/runtime-server/README.md` | document the new threaded options |
| **Architecture Docs** | n/a | n/a |
| **Similar Features** | `runQueueDepth`, `wsHighWaterMark` | already threaded at `server.ts:111-114` |
| **API Specs** | `RunQueueOptions` | already exposes `wsLowWaterMark` and `drainPollMs` |
| **ADR (New)** | N/A | none required |
| **Other Documentation** | `server.ts:111-114` | low-water/poll hardcoded to defaults (0 / 5ms) |

## Design & Planning

### Initial Design Thoughts & Requirements

> `RunQueueOptions` exposes both `wsLowWaterMark` and `drainPollMs`, but `createServer` only threads `runQueueDepth` and `wsHighWaterMark` into the `RunQueue`. The cross-block drain low-water mark and poll interval are hardcoded to defaults in any real server.

* Requirement: thread both options through `createServer` so drain behavior is tunable.
* Failure mode: an operator wanting a non-zero low-water mark has no config path short of constructing the queue by hand.

### Acceptance Criteria

* [ ] `createServer` accepts and threads `wsLowWaterMark` into the `RunQueue`.
* [ ] `createServer` accepts and threads `drainPollMs` into the `RunQueue`.
* [ ] Defaults (0 / 5ms) are preserved when the options are unset.
* [ ] A test verifies both options reach the `RunQueue`.
* [ ] README documents the new options.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | mirror existing threaded options | - [ ] Design Complete |
| **Test Plan Creation** | server-run config test | - [ ] Test Plan Approved |
| **TDD Implementation** | pending | - [ ] Implementation Complete |
| **Integration Testing** | pending | - [ ] Integration Tests Pass |
| **Documentation** | README options | - [ ] Documentation Complete |
| **Code Review** | pending | - [ ] Code Review Approved |
| **Deployment Plan** | additive | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | assert options reach RunQueue | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | pending | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | pending | - [ ] Originally failing tests now pass |
| **4. Refactor** | pending | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | pending | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

> Files: `packages/runtime-server/src/server.ts`, `packages/runtime-server/src/run-queue.ts` (RunQueueOptions surface), `packages/runtime-server/src/server-run.test.ts`.

**Test Strategy:** mirror the existing `runQueueDepth` / `wsHighWaterMark` threading test.

**Key Implementation Decisions:** purely mechanical — thread two existing fields through one constructor.

```python
# createServer({ wsLowWaterMark, drainPollMs }) -> new RunQueue({ ...these })
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
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | full drain-tuning config surface |

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
