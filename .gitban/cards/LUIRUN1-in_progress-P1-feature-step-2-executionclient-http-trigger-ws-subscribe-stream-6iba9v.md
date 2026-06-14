# step 2: ExecutionClient — HTTP trigger + WS subscribe-only stream

> **Design Phase 1** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 2. The SPA's transport seam to the s1 backend: trigger runs over the HTTP `POST …/run` routes (which return `202 { runId }`) and subscribe to the `runId`-tagged `WsServerEvent` stream over `WS /api/stream`. The FIRST runtime (non-type) backend interaction from `apps/studio` — must stay inside the ADR-006/007 isolation boundary.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 2
* **Feature Area/Component:** `apps/studio/src/execution/ExecutionClient.ts`
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
| **Design Doc** | `docs/designs/m3-s3-live-execution.md` Phase 1 + Interface (`ExecutionClient`) | HTTP-trigger (KD-2), WS subscribe-only, type-only boundary |
| **ADR** | ADR-005 §Decision (HTTP for request/response + WS for the event stream) | The SPA speaks the app-level contract only, never Jupyter |
| **API Specs** | `@deepnote/runtime-server/types` (`api-types.ts`) | `WsServerEvent`, `WsClientMessage`, `RunId` shapes |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 1 + Interface | `docs/designs/m3-s3-live-execution.md` (ExecutionClient interface; KD-2) | The `runBlock`/`runAll`/`subscribe`/`cancel` contract + HTTP-trigger rationale |
| WS/HTTP protocol | `packages/runtime-server/src/api-types.ts` | `WsServerEvent`/`WsClientMessage`/`RunId` — imported type-only, never re-declared |
| s1 run routes | `packages/runtime-server/src/router.ts` (`handleRun` → 202 {runId} / 429 / 500) | The HTTP endpoints `runBlock`/`runAll` POST to |
| Isolation invariant | `test-helpers/apps-studio-isolation.test.ts`; `apps/studio/src/api/fetchProject.ts` | The type-only boundary pattern this extends (fetch + type import) |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/execution/ExecutionClient.ts` — `runBlock(blockId, notebookName): Promise<RunId>` (POST `…/blocks/{id}/run`), `runAll(): Promise<RunId>` (POST `/api/project/run`), both resolving the server `runId` from the `202`, rejecting a typed `RunTriggerError` on `429` (queue-full) / `500 { failureCategory }`; `subscribe(onEvent): () => void` over a single `WS /api/stream` (subscribe-only); `cancel(runId)` over the WS; `connect()`/`close()`/`status`.
* Constraint (R6): the ONLY imports from `@deepnote/runtime-server` are **types** from the Node-free `/types` entry; the transport is the browser-native `fetch` + `WebSocket` globals; NO backend runtime value, NO `node:` builtin.
* Constraint (KD-2): runs are triggered via HTTP (deterministic `runId`); the WS is subscribe-only and the caller filters by owned `runId`s.
* Robustness: a malformed WS frame (JSON.parse throw) is dropped, not fatal; reconnect with capped backoff on close.

### Acceptance Criteria

* [ ] `runBlock`/`runAll` POST to the s1 run routes and resolve the server `runId` (202), or reject a typed error on 429/500.
* [ ] `subscribe` delivers parsed `WsServerEvent`s in arrival order; a malformed frame is dropped without throwing.
* [ ] `cancel(runId)` serializes the exact `{type:'cancel',runId}` WS message.
* [ ] The SPA imports the WS/HTTP shapes **type-only** from `@deepnote/runtime-server/types`; boundary check + isolation test pass (zero `apps/` files in root tsc).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 1 | - [ ] Design Complete |
| **Test Plan Creation** | fetch-stub trigger tests + WS-stub stream tests + boundary test | - [ ] Test Plan Approved |
| **TDD Implementation** | ExecutionClient (runBlock/runAll/subscribe/cancel/connect/close) | - [ ] Implementation Complete |
| **Integration Testing** | Against a stubbed fetch + WebSocket | - [ ] Integration Tests Pass |
| **Documentation** | README "Execution transport" section | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | stub `fetch` → 202{runId}/429/500; `runBlock`/`runAll` resolve runId or reject typed; fake `WebSocket` → subscribe gets parsed events, malformed frame dropped, cancel serializes; boundary (no backend runtime import) | - [ ] Failing tests committed |
| **2. Implement Feature Code** | ExecutionClient + ws-URL derivation + RunTriggerError | - [ ] Feature implementation complete |
| **3. Run Passing Tests** | studio vitest green; type-only assertion compiles | - [ ] Originally failing tests pass |
| **4. Refactor** | Tidy connect/reconnect plumbing | - [ ] Code refactored |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation/boundary green | - [ ] All tests pass |
| **6. Performance Testing** | N/A (transport seam; <2s measured in step 6) | - [ ] N/A |

### Implementation Notes

**Test Strategy:** DOM-env vitest (jsdom). Tests first. Stub `globalThis.fetch` for the trigger paths (assert the POST URL + that the `202 {runId}` resolves and 429/500 reject the typed error). Stub `globalThis.WebSocket` for the stream (assert connect→OPEN, an inbound frame deserializes to a `WsServerEvent` and reaches `subscribe`, a malformed frame is dropped, `cancel` serializes the exact JSON, reconnect-with-backoff fires on close). The boundary test (AST/grep) asserts no value import from `@deepnote/runtime-server`/`runtime-core` and no `node:` import.

**Key Implementation Decisions:** HTTP-trigger (KD-2) for deterministic `runId`; WS is subscribe-only; `WebSocket`/`fetch` are browser globals (the transport is not a backend import).

## Definition of Done

**Intent (plain English):** From the browser, the SPA can ask the local server to run a block and get back a handle (`runId`) for that run, then watch the live event stream for that run — without the SPA ever importing the server's runtime code or speaking the kernel's protocol. If this breaks, clicking Run would either silently do nothing (trigger failed) or the live output would never arrive (stream not consumed), and the backend's own typecheck/lint gate would go red if the SPA accidentally pulled in a runtime import.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** against a stubbed `fetch` + `WebSocket`, `runBlock('b1','nb')` POSTs to `/api/notebooks/nb/blocks/b1/run`, resolves the server `runId` from the `202`, and a subsequent inbound `{type:'block-start',runId,…}` frame is delivered to a `subscribe` callback as a parsed `WsServerEvent` — proving trigger→stream correlation by the HTTP-returned `runId`; a `429` rejects a typed `RunTriggerError('queue-full')`.
* [ ] `cancel(runId)` serializes exactly `{type:'cancel',runId}` over the WS.
* [ ] A malformed inbound frame is dropped (no throw); reconnect-with-backoff fires on socket close.
* [ ] The only `@deepnote/runtime-server` import is types from the Node-free entry; no backend runtime value, no `node:` import (boundary test + isolation test green; root `tsc --listFilesOnly` names 0 `apps/` files).

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Trigger resolves runId; stream delivers events; boundary holds |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 3 folds events into per-block run state |

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
