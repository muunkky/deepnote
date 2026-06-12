# step 4A: execute-stream-ws — the run-serialization queue

> **Sprint**: LUI1WEDGE | **Step**: 4A (parallel with 4B save-api) | **Roadmap**: m3/s1/serve-api/execute-stream-ws
> **Depends on**: step 3 (project-open-list-api, `x71bcm`). **Parallel-safe with** step 4B (`save-api`) — disjoint files (`run-queue.ts`/`session.ts`/WS fan-out vs `save.ts`). **Unblocks**: step 5 (server-integration-tests).
> **This is the biggest and riskiest card in the sprint** — the net-new run-serialization / back-pressure layer `run.ts` does not have. The design doc's queue design drives this DoD verbatim.

## API Feature Overview

* **Feature Description:** Drive `ExecutionEngine.runProject` from a single-concurrency FIFO run queue and stream every `onBlockStart`/`onOutput`/`onBlockDone` over `WS /api/stream` in order, with no dropped or reordered events; forward typed failure categories; guarantee a terminal event for every run.
* **API Resource/Endpoint:** `POST /api/notebooks/{nb}/blocks/{id}/run` (runScope `'block'`), `POST /api/project/run` (run-all), `WS /api/stream`.
* **HTTP Methods:** POST (run) + WebSocket (event stream).
* **API Version:** s1 app-level WS contract (`WsClientMessage`/`WsServerEvent`).
* **Related Work:** design doc "THE RUN-SERIALIZATION POLICY (R4)" + Phase 3 + KD-5 + failure-category mapping; ADR-005 Negative (single shared kernel, serialize at server).
* **Client Impact:** the SPA's only execution vocabulary; back-channel for live output.
* **Target Release:** m3/s1.

**Required Checks:**
* [ ] **API resource/endpoint** path is clearly defined.
* [ ] **API version** is specified and versioning strategy is understood.
* [ ] **Client impact** is identified (who will consume this API).

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "THE RUN-SERIALIZATION POLICY (R4)" (whole section — mechanism, enqueue policy table P1/P2/P3/P5, `maxDepth` 8, guaranteed-terminal B1, no-interleave test); "Back-pressure" (two regimes, S1); "Failure-category mapping (R5)"; Phase 3 DoD | The queue, the policies, the two back-pressure regimes, the failure mapping — all load-bearing. |
| `docs/adr/ADR-005-browser-kernel-transport-proxy.md` | Negative §"single shared kernel … must be serialized"; Negative §"kernel dies mid-run must be terminal" | Why the queue exists; why kernel death must be an explicit terminal WS event. |
| `packages/runtime-core/src/execution-engine.ts` | callbacks (72–74); `runProject` (177); per-block loop (249–253); awaited `onBlockStart`/`onBlockDone` (253,404,423,444); the `break` on failure (426–429 non-agent, 431–446 catch); `collectedOutputs` (246) | The engine emits sequentially and `break`s on any block failure → `runProject` RESOLVES with `failedBlocks>0`; cross-block callbacks are awaited (free back-pressure); `onOutput` (74) is sync/un-pausable (within-block bound). |
| `packages/runtime-core/src/kernel-client.ts` | typed errors import (5); single session/kernel (85–88); mid-run death → `KernelDiedError` via `statusChanged`/reject (240–289) | Mid-run kernel death is the ONLY case `runProject` rejects → terminal `run-failed`. |
| `packages/cli/src/commands/run.ts` | `onBlockDone` failure-category capture (1196–1200); outer kernel-died catch (1117) | KD-5: read the discriminant from the still-typed instance, before flatten to `.message`, exactly as `run.ts` does. |

## API Design & Contract Review

* [ ] API design guidelines reviewed (REST conventions, naming, HTTP status codes).
* [ ] Existing API contracts reviewed for consistency (similar endpoints, patterns).
* [ ] OpenAPI/Swagger specification template reviewed for documentation format.
* [ ] Authentication/authorization requirements reviewed (OAuth, API keys, JWT).
* [ ] Rate limiting and quota policies reviewed for this endpoint.
* [ ] Versioning strategy reviewed (URL versioning, header versioning, deprecation policy).

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Resource Naming** | `POST /api/notebooks/{nb}/blocks/{id}/run`, `POST /api/project/run`, `WS /api/stream` | `{nb}`=URL-encoded notebook name; `{id}`=block id. |
| **Concurrency policy** | single-concurrency FIFO; queue-by-default, bounded `maxDepth` (default 8) | P1 run-now; P2 enqueue+`run-queued`; P3 at-depth → `429 queue-full`; P5 queued-cancel. |
| **runId tagging** | every WS event carries a monotonic `runId` | consumer attributes events unambiguously; no interleave. |
| **Terminal event** | exactly one of `run-done` (always, on resolve, incl. in-block break) / `run-failed` (kernel-death reject only) | B1 — closes the "un-started blocks hang forever" gap for the COMMON in-block failure. |
| **Failure categories** | `missing-kernel`/`kernel-launch`/`kernel-died`/`in-block` from typed instances | KD-5 — not re-derived from strings. |
| **Back-pressure (cross-block)** | do not resolve awaited `onBlockDone` until `ws.bufferedAmount` drains | free; pauses production, no buffer. |
| **Back-pressure (within-block)** | bounded `stream` buffer (default 8 MiB, `wsHighWaterMark`); past bound → single `{truncated:true}` marker | lifecycle/result outputs NEVER dropped. |
| **The invariant** | `engine.runProject` referenced ONLY by `run-queue.ts` | lint/madge rule — no un-serialized run can exist by construction (M2). |
| **Status Codes** | 202 `{runId}` on enqueue; 400 bad nb/block; 429 `queue-full`; 200/500 `{error,failureCategory}` on kernel-start failure | per HTTP surface. |
| **DEFERRED to m3/s5** | P4 run-all coalescing; P6 running-cancel; `runScope:'with-upstream'` | settled deferrals — NOT in this card. |

## API Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **API Contract Design** | `WsClientMessage`/`WsServerEvent` in `api-types.ts` | - [ ] OpenAPI/Swagger spec is complete and reviewed. |
| **Contract Review** | reviewer | - [ ] API contract is reviewed and approved by team/stakeholders. |
| **TDD Implementation** | `run-queue.ts`, `session.startEngine()`/`runProject()`, WS fan-out, adapter | - [ ] TDD workflow followed (tests first, then implementation). |
| **Integration Tests** | a real run streams ordered events matching `deepnote run` (full coverage in step 5) | - [ ] Integration tests cover happy path and error cases. |
| **Security Review** | kernel port never reaches the socket | - [ ] Security requirements validated (auth, input validation, rate limiting). |
| **API Documentation** | README WS contract (ADR-005 app-level contract verbatim) | - [ ] API documentation is complete with examples and error codes. |
| **Client SDK Updates** | N/A | - [ ] Client SDKs updated [if applicable] or follow-up cards created. |
| **Deployment** | N/A | - [ ] API is deployed and verified in production. |

## Definition of Done

### Intent

A concurrent UI can fire runs at a server that fronts exactly one sequential kernel, and never see corrupted output: runs execute one at a time, their events arrive in a single totally-ordered stream tagged by `runId`, and every run a user starts visibly finishes — even when a block raises an exception (the engine stops the run early) or the kernel dies mid-run. From the outside, "working" looks like: hit Run on a slow block then a fast one, and the fast run's output never bleeds into the slow run's; a block that errors still flips the run to a terminal "done with failures" state instead of spinning forever; a dead kernel shows an explicit failure instead of a permanently-pending run. If this breaks, a user would see interleaved/garbled output across blocks, or a run stuck "running" forever after a cell errored — the exact failures ADR-005 names.

### Observable outcomes

- [ ] **Capstone (no-interleave):** issuing run A (slow block that sleeps while emitting stdout) then run B (fast) over one WS produces a recorded event log where **every** `runId:A` event precedes **every** `runId:B` event, and within each run `block-start → output* → block-done` order holds — no `runId:B` event appears between A's `run-start` and A's terminal event.
- [ ] **Capstone (guaranteed terminal):** a run whose engine `break`s on an in-block failure still emits a terminal `run-done` with `failedBlocks > 0`, and **no further events** arrive for that `runId` afterward (B1).
- [ ] **The load-bearing invariant (M2):** a lint/`madge` rule asserts `engine.runProject` (via `session.runProject`) is referenced **only** by `run-queue.ts`; the check fails CI if any other module references it.
- [ ] **Capstone (kernel-death terminal):** a mid-run `KernelDiedError` (engine `runProject` rejects) produces a terminal `run-failed { failureCategory:'kernel-died' }` and the consumer stops waiting (does not hang).
- [ ] Failure categories `missing-kernel` / `kernel-launch` / `kernel-died` / `in-block` are each distinguishable in the right shape (HTTP error payload vs `block-done.failureCategory` vs terminal `run-failed`), sourced from the typed instances.
- [ ] Enqueue policy: P1 runs immediately; P2 enqueues + emits `run-queued {queueDepth}` (HTTP 202); P3 at `maxDepth` rejects with HTTP `429 {error:'queue-full'}` and **no** WS event; P5 `{type:'cancel',runId}` for a queued task removes it and emits `run-cancelled`, never started.
- [ ] Back-pressure regime 1 (cross-block): a stubbed socket with high `bufferedAmount` causes the awaited `onBlockDone` to not resolve until the socket drains, so the engine does not start the next block (production pauses).
- [ ] Back-pressure regime 2 (within-block): a single block emitting `stream` past the 8 MiB bound yields one `{type:'output',truncated:true}` marker, while `block-start`/`block-done`/`execute_result`/`display_data`/`error` are **never** dropped.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Contract Tests** | `WsServerEvent` union covers all event types; runId on every event | - [ ] Contract tests validate API adheres to OpenAPI spec. |
| **2. Write Failing Integration Tests** | no-interleave; guaranteed-terminal; kernel-death terminal; policy P1/P2/P3/P5; both back-pressure regimes; madge invariant | - [ ] Integration tests written covering all endpoints and methods. |
| **3. Implement API Endpoints** | `run-queue.ts` (drain = sole caller of engine.runProject), `session` engine pass-through, WS fan-out adapter, POST routes | - [ ] API endpoints implemented, returning correct status codes. |
| **4. Run Passing Tests** | mocked suites green | - [ ] All integration tests pass, API behavior verified. |
| **5. Add Error Handling Tests** | failure-category mapping (each typed error → correct shape); 400 bad ids; 429 at depth | - [ ] Error handling tests written and passing. |
| **6. Security Tests** | kernel port never written to socket | - [ ] Security tests validate auth, input sanitization, rate limiting. |
| **7. Performance Tests** | N/A (latency is the spike's; covered by integration parity in step 5) | - [ ] Performance validated against requirements [if applicable]. |
| **8. Regression Suite** | package + repo test green | - [ ] Full regression suite passed, no existing APIs broken. |

#### API Implementation Notes

> **Test Strategy (the concurrency/serialization test is load-bearing — behavior over structure, failure modes first):**
> - **The M2 invariant** is asserted *structurally* on purpose — a lint/`madge` rule that `engine.runProject` is referenced ONLY by `run-queue.ts`. The design doc is explicit that an ordering test alone "proves little" because ordering is structurally guaranteed; the real guarantee is that no other code path can issue an un-serialized run. Wire this as a hard CI check.
> - **No-interleave** uses a mocked engine whose `runProject` yields control between blocks, so two overlapping runs are issued and the recorded WS log is asserted fully ordered by `runId`. Pure ordering assertion over the log — no real-kernel timing luck needed.
> - **Guaranteed-terminal-event for in-block failure** is the corrected B1 behavior: the engine `break`s on any block failure (execution-engine.ts:426–429/431–446), so `runProject` RESOLVES with `failedBlocks>0`; `drain` MUST emit `run-done` (not `run-failed`) and then nothing. Test it explicitly — this closes the common-failure hang, not just kernel death.
> - **Kernel-death** is the only reject path → terminal `run-failed`; the consumer-does-not-hang assertion is mandatory.
> - **Failure-category** tests assert the discriminant is read from the typed instance (KD-5), not a stringified message.
> - **Back-pressure**: regime 1 asserts production *pauses* (engine doesn't start next block) when the stubbed socket's `bufferedAmount` stays high; regime 2 asserts a `truncated` marker past 8 MiB while lifecycle/result events survive.
> - **NO tests for P4 coalescing or P6 running-cancel** — both are m3/s5.

**Middleware Stack:** none.

**Database Queries:** N/A.

**Caching Strategy:** within-block `stream` buffer bounded at `wsHighWaterMark` (8 MiB default); cross-block uses await-gating, no buffer.

## API Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **OpenAPI Spec Location** | `api-types.ts` `WsClientMessage`/`WsServerEvent` |
| **API Documentation URL** | package README WS contract |
| **Integration Test Coverage** | ordered real run in step 5; mocked suites here |
| **Security Validation** | kernel port never on the socket |
| **Performance Metrics** | parity measured in step 5 |
| **Client Communication** | SPA consumes `WsServerEvent` from `/types` |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **API Changelog Updated?** | Closeout card. |
| **Client SDK Updates?** | N/A |
| **Deprecation Notices?** | None |
| **Monitoring/Alerts?** | N/A |
| **Rate Limit Tuning?** | `maxDepth` default 8, tunable via `createServer({runQueueDepth})`. |
| **API Versioning Review?** | App-level contract. |
| **Documentation Feedback?** | None yet |

### Completion Checklist

* [ ] OpenAPI/Swagger specification is complete and merged.
* [ ] API contract is reviewed and approved by team/stakeholders.
* [ ] TDD workflow followed: tests written first, then implementation.
* [ ] All integration tests pass (happy path + error cases).
* [ ] Security requirements validated (authentication, authorization, input validation, rate limiting).
* [ ] API documentation is complete with request/response examples and error codes.
* [ ] Performance validated against requirements [if applicable].
* [ ] Client SDKs updated or follow-up cards created.
* [ ] API changelog updated with new endpoints and changes.
* [ ] Monitoring and alerts configured for the new API.
* [ ] API is deployed to production and verified working.
* [ ] Client communication sent (email, Slack, API portal announcement).
