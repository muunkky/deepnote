# step 2: ExecutionClient — HTTP trigger + WS subscribe-only stream

> **Design Phase 1** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 2. The SPA's transport seam to the s1 backend: trigger runs over the HTTP `POST …/run` routes (which return `202 { runId }`) and subscribe to the `runId`-tagged `WsServerEvent` stream over `WS /api/stream`. The FIRST runtime (non-type) backend interaction from `apps/studio` — must stay inside the ADR-006/007 isolation boundary.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 2
* **Feature Area/Component:** `apps/studio/src/execution/ExecutionClient.ts`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

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

- [x] `runBlock`/`runAll` POST to the s1 run routes and resolve the server `runId` (202), or reject a typed error on 429/500.
- [x] `subscribe` delivers parsed `WsServerEvent`s in arrival order; a malformed frame is dropped without throwing.
- [x] `cancel(runId)` serializes the exact `{type:'cancel',runId}` WS message.
- [x] The SPA imports the WS/HTTP shapes **type-only** from `@deepnote/runtime-server/types`; boundary check + isolation test pass (zero `apps/` files in root tsc).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 1 | - [x] Design Complete |
| **Test Plan Creation** | fetch-stub trigger tests + WS-stub stream tests + boundary test | - [x] Test Plan Approved |
| **TDD Implementation** | ExecutionClient (runBlock/runAll/subscribe/cancel/connect/close) | - [x] Implementation Complete |
| **Integration Testing** | Against a stubbed fetch + WebSocket | - [x] Integration Tests Pass |
| **Documentation** | README "Execution transport" section | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [x] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | stub `fetch` → 202{runId}/429/500; `runBlock`/`runAll` resolve runId or reject typed; fake `WebSocket` → subscribe gets parsed events, malformed frame dropped, cancel serializes; boundary (no backend runtime import) | - [x] Failing tests committed |
| **2. Implement Feature Code** | ExecutionClient + ws-URL derivation + RunTriggerError | - [x] Feature implementation complete |
| **3. Run Passing Tests** | studio vitest green; type-only assertion compiles | - [x] Originally failing tests pass |
| **4. Refactor** | Tidy connect/reconnect plumbing | - [x] Code refactored |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation/boundary green | - [x] All tests pass |
| **6. Performance Testing** | N/A (transport seam; <2s measured in step 6) | - [x] N/A |

### Implementation Notes

**Test Strategy:** DOM-env vitest (jsdom). Tests first. Stub `globalThis.fetch` for the trigger paths (assert the POST URL + that the `202 {runId}` resolves and 429/500 reject the typed error). Stub `globalThis.WebSocket` for the stream (assert connect→OPEN, an inbound frame deserializes to a `WsServerEvent` and reaches `subscribe`, a malformed frame is dropped, `cancel` serializes the exact JSON, reconnect-with-backoff fires on close). The boundary test (AST/grep) asserts no value import from `@deepnote/runtime-server`/`runtime-core` and no `node:` import.

**Key Implementation Decisions:** HTTP-trigger (KD-2) for deterministic `runId`; WS is subscribe-only; `WebSocket`/`fetch` are browser globals (the transport is not a backend import).

## Definition of Done

**Intent (plain English):** From the browser, the SPA can ask the local server to run a block and get back a handle (`runId`) for that run, then watch the live event stream for that run — without the SPA ever importing the server's runtime code or speaking the kernel's protocol. If this breaks, clicking Run would either silently do nothing (trigger failed) or the live output would never arrive (stream not consumed), and the backend's own typecheck/lint gate would go red if the SPA accidentally pulled in a runtime import.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** against a stubbed `fetch` + `WebSocket`, `runBlock('b1','nb')` POSTs to `/api/notebooks/nb/blocks/b1/run`, resolves the server `runId` from the `202`, and a subsequent inbound `{type:'block-start',runId,…}` frame is delivered to a `subscribe` callback as a parsed `WsServerEvent` — proving trigger→stream correlation by the HTTP-returned `runId`; a `429` rejects a typed `RunTriggerError('queue-full')`.
- [x] `cancel(runId)` serializes exactly `{type:'cancel',runId}` over the WS.
- [x] A malformed inbound frame is dropped (no throw); reconnect-with-backoff fires on socket close.
- [x] The only `@deepnote/runtime-server` import is types from the Node-free entry; no backend runtime value, no `node:` import (boundary test + isolation test green; root `tsc --listFilesOnly` names 0 `apps/` files).

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


## Close-out — LUIRUN1 step 2 (executor cycle 1)

**Shipped** — `apps/studio/src/execution/ExecutionClient.ts` (the transport seam) + `ExecutionClient.test.ts` (15 tests, written first/TDD), the isolation test extended with an ExecutionClient-specific boundary case, the README "Execution transport" section, and a `backoff`/`LUIRUN` cspell addition.

**What the code does (per KD-2 / the interface in the design doc):**
- `createExecutionClient(baseUrl)` returns an `ExecutionClient`. **Trigger over HTTP:** `runBlock(blockId, notebookName)` POSTs `/api/notebooks/{nb}/blocks/{id}/run` (URL-encoding both segments); `runAll()` POSTs `/api/project/run`. Both resolve the server `runId` from the `202 { runId }`. A `429` rejects `RunTriggerError` with `reason:'queue-full'`; a `500 { error, failureCategory }` rejects `reason:'engine-start'` carrying the typed `KernelFailureCategory` + the s1 `{ error }` message; a pre-response failure rejects `reason:'network'` (no status).
- **Stream + cancel over the WS:** `connect()` opens the single `WS /api/stream` (subscribe-only), resolving once OPEN; `subscribe(onEvent)` delivers parsed `WsServerEvent`s in arrival order and returns an unsubscribe; a malformed frame (`JSON.parse` throw) is dropped, not fatal; `cancel(runId)` serializes exactly `{type:'cancel',runId}`; `close()` stops reconnection. The socket reconnects with a capped exponential backoff (500ms→5s) on close.
- `streamUrl(baseUrl)` derives `ws(s)://host/api/stream` from the http(s) base URL, resolving an empty base against the page origin.

**Isolation (ADR-006/007, load-bearing):** the WS/HTTP shapes (`WsClientMessage`, `WsServerEvent`, `RunId`, `KernelFailureCategory`) are `import type` from `@deepnote/runtime-server/types`; the transport is the browser `fetch` + `WebSocket` globals — no backend runtime value, no `node:` builtin. The new isolation case asserts every `@deepnote/runtime-server` import is `import type` from the `/types` subpath, forbids `node:`/runtime-core value imports, and positively asserts the file reaches for `new WebSocket(`/`fetch(` (a guard against a silent refactor to a Node client).

**Tests actually run (not deferred to CI):**
- `apps/studio/src/execution/ExecutionClient.test.ts` — **15 passed** (jsdom). Fetch-stub trigger paths (202 resolves runId, URL-encoding, 429→queue-full, 500→engine-start+failureCategory, network→no status) + fake-`WebSocket` stream paths (connect→OPEN, ws/wss/origin URL derivation, ordered delivery, malformed-frame drop, unsubscribe, exact cancel serialization, capped-backoff reconnect on close, close() suppresses reconnect).
- `test-helpers/apps-studio-isolation.test.ts` — **4 passed** (node backend suite), including the capstone `tsc -p tsconfig.json --listFilesOnly` naming **zero** `apps/` files and the new ExecutionClient boundary case.
- `apps/studio` full suite — **162 passed** (no s2 regression).
- Gates: `apps/studio` `tsc --noEmit` clean; root backend `tsc --noEmit -p tsconfig.json` clean (gate not reddened); Biome clean on the new/changed TS; Prettier clean on README + cspell.json; cspell clean on all changed files (run via `--no-gitignore` to defeat the worktree useGitignore quirk).

**Deferred:** none. Phases 2–4 (runStore/useExecution, Run affordances + live rendering, failure surfacing + the gated real-kernel <2s measurement) are separate steps of this sprint, out of scope for step 2.

**Note on scope:** this is a transport seam verified against stubbed `fetch`/`WebSocket` only — no real kernel was exercised (that is the Phase-4 gated integration measurement). The trigger→stream correlation is proven structurally (HTTP-returned `runId` + a subsequent inbound frame reaching `subscribe`), not against a live `deepnote serve`.

**Profiling log:** `agent_log_*` events were emitted, but `.gitban/agents/executor/logs/` is gitignored in this worktree so the `.jsonl` could not be committed from here — it lives in the parent store and the dispatcher reconciles `.gitban/` state on merge-back.

**Commit:** `b146370` (worktree branch). Remaining unchecked boxes are reviewer/dispatcher-owned (code review, PR merge, deploy/monitoring/stakeholder/epic-close — several N/A for the fork-only showcase). Card left `in_progress` for the reviewer.