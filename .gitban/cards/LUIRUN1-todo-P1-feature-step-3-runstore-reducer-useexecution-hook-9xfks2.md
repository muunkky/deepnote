# step 3: runStore reducer + useExecution hook

> **Design Phase 2** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 3. The execution-state model: a pure reducer that folds `WsServerEvent`s into per-block run state + counts, and the hook that wires `ExecutionClient` ⇄ reducer ⇄ React with the `runId↔block` correlation bound at HTTP-trigger time.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 3
* **Feature Area/Component:** `apps/studio/src/state/runStore.ts`, `apps/studio/src/execution/useExecution.ts`
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
| **Design Doc** | `docs/designs/m3-s3-live-execution.md` Phase 2 + Interface (`runStore`, event→state mapping) | `BlockRunState`/`RunState`; the exact event→state contract |
| **API Specs** | `@deepnote/runtime-server/types` (`WsServerEvent`, `RunId`, `IOutput`) | Imported type-only |
| **Prior art** | `apps/studio/src/state/projectStore.ts` | The discriminated-state pattern this mirrors |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 2 + event→state mapping | `docs/designs/m3-s3-live-execution.md` | The reducer contract: replace-on-block-start, executionCount on block-done, total from block-start.total, reconnect resets to idle |
| ExecutionClient | `apps/studio/src/execution/ExecutionClient.ts` (step 2) | The client the hook drives; `runBlock`/`runAll` return the `runId` to bind |
| WS event union | `packages/runtime-server/src/api-types.ts` | Every `WsServerEvent` variant the reducer must handle |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/state/runStore.ts` — `applyEvent(state, event, ctx) → state` pure reducer + `initialRunState`. `RunState = { byBlock: Record<string,BlockRunState>; runs: Record<RunId,{blockIds,status}>; kernelBanner? }`; `BlockRunState = { status; outputs: IOutput[]; executionCount; truncated; failureCategory? }`.
* Deliverable: `src/execution/useExecution.ts` — hook holding `RunState`, exposing `runBlock(blockId)`/`runAll()`/`cancel(runId)` + per-block selectors; binds `runId→blockId(s)` from the `runBlock`/`runAll` resolution (KD-2); one client + one store per loaded project.
* Reducer contract (the test pins it): `run-queued`→queued; `run-start`→running (DON'T read `run-start.totalBlocks` — it's a stub 0; use `block-start.total`); `block-start`→running + **clear outputs** (replace-on-start) + record index/total; `output`(normal)→append; `output`(truncated)→set truncated; `block-done`→done/failed by success + set failureCategory + **bump that block's executionCount on success**; `run-done`→finalize run; `run-failed`→set kernelBanner + mark in-flight failed; `run-cancelled`→queued→idle; **reconnect**→mark non-terminal owned blocks idle (no replay).

### Acceptance Criteria

* [ ] `applyEvent` handles every `WsServerEvent` variant per the contract; pure (no side effects).
* [ ] `useExecution` binds `runId→blockId(s)` from the HTTP-trigger resolution, for single-block and run-all.
* [ ] `executionCount` increments per-block on `block-done` success (not once per `run-done`); block count comes from `block-start.total`.
* [ ] Reconnect (socket close) marks non-terminal owned blocks `idle`.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :--- |
| **Design & Architecture** | Design Phase 2 | - [ ] Design Complete |
| **Test Plan Creation** | reducer-sequence tests + hook tests (fake client) | - [ ] Test Plan Approved |
| **TDD Implementation** | runStore reducer + useExecution hook | - [ ] Implementation Complete |
| **Integration Testing** | Hook ⇄ fake ExecutionClient | - [ ] Integration Tests Pass |
| **Documentation** | README "Execution state" subsection | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | reducer driven by a scripted event sequence (single-block + run-all): queued→running→done, executionCount per-block on block-done, replace-on-block-start, truncated flag, run-failed/run-cancelled, total from block-start; hook: runBlock/runAll bind runId→block, selectors return right state, reconnect resets idle | - [ ] Failing tests committed |
| **2. Implement Feature Code** | applyEvent + useExecution | - [ ] Feature implementation complete |
| **3. Run Passing Tests** | studio vitest green | - [ ] Originally failing tests pass |
| **4. Refactor** | Tidy selector/binding plumbing | - [ ] Code refactored |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation green | - [ ] All tests pass |
| **6. Performance Testing** | N/A | - [ ] N/A |

### Implementation Notes

**Test Strategy:** the reducer is a pure function — unit-test it against scripted `WsServerEvent` sequences with NO socket (the highest-value, most-deterministic tests). The hook test feeds events through a fake `ExecutionClient`. Pin the exact mapping (especially replace-on-block-start, per-block executionCount on block-done, total-from-block-start, reconnect-resets-idle — the four correction points from design review).

**Key Implementation Decisions:** one store/client per project (the backend has one queue/kernel); correlation bound deterministically from the HTTP-returned runId (KD-2), not inferred from events.

## Definition of Done

**Intent (plain English):** As runs happen, the viewer knows — for every block — whether it's idle, queued, running, done, or failed; what its live outputs are; and how many times it's been run this session. A reader watching a run sees each block light up in order and its output accumulate. If this breaks, blocks would show the wrong state (a running block stuck "idle", or an output attributed to the wrong block), or the execution count would drift.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** feeding the reducer a real `WsServerEvent` sequence for a run-all over blocks [b1,b2] — `run-start`, `block-start(b1)`, `output(b1)`, `block-done(b1,success)`, `block-start(b2)`, `output(b2)`, `block-done(b2,success)`, `run-done` — yields `byBlock` where b1 and b2 each have `status:'done'`, their streamed `outputs`, and `executionCount:1`; a re-run of b1 clears b1's prior outputs on its `block-start` and bumps its count to 2 — proving the full lifecycle + replace-on-start + per-block counting end to end.
* [ ] `useExecution.runBlock('b2')` binds the HTTP-returned `runId` to `b2` so b2's subsequent events update b2's state (correlation, single-block).
* [ ] A `run-failed` after `block-start` marks the in-flight block `failed` and sets `kernelBanner`; a socket close marks non-terminal owned blocks `idle`.
* [ ] Reducer is pure (same input → same output, no side effects); studio suite + isolation green.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Reducer transitions correct; hook correlation correct |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 4 renders this state in the UI |

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
