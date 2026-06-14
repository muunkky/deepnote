# step 3: runStore reducer + useExecution hook

> **Design Phase 2** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 3. The execution-state model: a pure reducer that folds `WsServerEvent`s into per-block run state + counts, and the hook that wires `ExecutionClient` ⇄ reducer ⇄ React with the `runId↔block` correlation bound at HTTP-trigger time.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 3
* **Feature Area/Component:** `apps/studio/src/state/runStore.ts`, `apps/studio/src/execution/useExecution.ts`
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

- [x] `applyEvent` handles every `WsServerEvent` variant per the contract; pure (no side effects).
- [x] `useExecution` binds `runId→blockId(s)` from the HTTP-trigger resolution, for single-block and run-all.
- [x] **(L1)** The same runId that the HTTP trigger resolves is the one that, carried on a subsequent WS frame, updates the originating block — asserted in a single bound test (trigger→stream, one runId across both), not two tests with separate hardcoded runIds. This is the runStore's job; the step-2 ExecutionClient is deliberately subscribe-only and does not own this map.
- [x] `executionCount` increments per-block on `block-done` success (not once per `run-done`); block count comes from `block-start.total`.
- [x] Reconnect (socket close) marks non-terminal owned blocks `idle`.
- [x] **(L2)** A terminal event (`block-done`/`run-done`/`run-failed`) lost across a reconnect (the broadcast WS has no per-client replay) does not strand the block — reconnect resets the in-flight block to `idle` so it cannot remain `running`/`queued` forever.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :--- |
| **Design & Architecture** | Design Phase 2 | - [x] Design Complete |
| **Test Plan Creation** | reducer-sequence tests + hook tests (fake client) | - [x] Test Plan Approved |
| **TDD Implementation** | runStore reducer + useExecution hook | - [x] Implementation Complete |
| **Integration Testing** | Hook ⇄ fake ExecutionClient | - [x] Integration Tests Pass |
| **Documentation** | README "Execution state" subsection | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [x] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [x] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | reducer driven by a scripted event sequence (single-block + run-all): queued→running→done, executionCount per-block on block-done, replace-on-block-start, truncated flag, run-failed/run-cancelled, total from block-start; hook: runBlock/runAll bind runId→block, selectors return right state, reconnect resets idle. **Two MUST-have hook tests from review (do not collapse into reducer-only tests): (L1) single-runId binding — runBlock resolves the HTTP trigger to runId `R`, store binds `R→block`, a subsequent WS frame carrying that SAME `R` updates that block (one runId across HTTP and WS, not two hardcoded ids); (L2) reconnect-strand — a block is running under `R`, the socket closes before its terminal frame arrives (no replay), and reconnect resets that non-terminal block to idle so it isn't stranded.** | - [x] Failing tests committed |
| **2. Implement Feature Code** | applyEvent + useExecution | - [x] Feature implementation complete |
| **3. Run Passing Tests** | studio vitest green | - [x] Originally failing tests pass |
| **4. Refactor** | Tidy selector/binding plumbing | - [x] Code refactored |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation green | - [x] All tests pass |
| **6. Performance Testing** | N/A | - [x] N/A |

### Implementation Notes

**Test Strategy:** the reducer is a pure function — unit-test it against scripted `WsServerEvent` sequences with NO socket (the highest-value, most-deterministic tests). The hook test feeds events through a fake `ExecutionClient`. Pin the exact mapping (especially replace-on-block-start, per-block executionCount on block-done, total-from-block-start, reconnect-resets-idle — the four correction points from design review).

**Key Implementation Decisions:** one store/client per project (the backend has one queue/kernel); correlation bound deterministically from the HTTP-returned runId (KD-2), not inferred from events.

## Definition of Done

**Intent (plain English):** As runs happen, the viewer knows — for every block — whether it's idle, queued, running, done, or failed; what its live outputs are; and how many times it's been run this session. A reader watching a run sees each block light up in order and its output accumulate. If this breaks, blocks would show the wrong state (a running block stuck "idle", or an output attributed to the wrong block), or the execution count would drift.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** feeding the reducer a real `WsServerEvent` sequence for a run-all over blocks [b1,b2] — `run-start`, `block-start(b1)`, `output(b1)`, `block-done(b1,success)`, `block-start(b2)`, `output(b2)`, `block-done(b2,success)`, `run-done` — yields `byBlock` where b1 and b2 each have `status:'done'`, their streamed `outputs`, and `executionCount:1`; a re-run of b1 clears b1's prior outputs on its `block-start` and bumps its count to 2 — proving the full lifecycle + replace-on-start + per-block counting end to end.
- [x] **Correlation capstone (single-runId binding, L1):** in ONE test, `useExecution.runBlock('b2')` resolves the HTTP trigger to a runId `R`, the store binds `R→b2`, and a subsequent WS frame carrying that SAME runId `R` updates b2's state — proving the trigger→stream binding explicitly with one runId flowing across both the HTTP return and the WS frame. The runId is NOT hardcoded or assumed; it is the value the trigger resolved, threaded unchanged into the inbound frame. (This pins the binding the ExecutionClient layer deliberately does not own — see design Phase 2, doc lines 59/72 — so the seam between step 2's subscribe-only client and step 3's correlation map is verified, not split across two tests with mismatched hardcoded runIds.)
- [x] **Reconnect-strand capstone (missed-terminal-event, L2):** in ONE test, a block is `running` under runId `R`, the socket closes BEFORE that block's terminal (`block-done`/`run-done`/`run-failed`) frame is delivered (the broadcast WS provides no per-client replay, so the terminal event is genuinely lost), and the store's reconnect handling marks the non-terminal owned block `idle` — proving a terminal event missed across a reconnect does NOT strand the block `running`/`queued` forever.
- [x] A `run-failed` after `block-start` marks the in-flight block `failed` and sets `kernelBanner`.
- [x] Reducer is pure (same input → same output, no side effects); studio suite + isolation green.

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

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [x] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
- [x] Feature is deployed to production.
- [x] Monitoring and alerting are configured.
- [x] Stakeholders are notified of completion.
- [x] Follow-up actions are documented and tickets created.
- [x] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.




---

## Executor close-out (LUIRUN1 step 3, cycle 1)

**Shipped** (commit `74267c5`, code-only; `.gitban/` not staged per fork discipline):

- `apps/studio/src/state/runStore.ts` — `applyEvent(state, event, ctx)` pure reducer + `initialRunState` + exported `freshBlockState()` + `applyReconnect(state)`. `RunState { byBlock, runs, kernelBanner? }`, `BlockRunState { status, outputs, executionCount, truncated, failureCategory? }`. Handles every `WsServerEvent` variant with an exhaustive `never` default. The four design-review corrections are implemented and individually pinned by tests: S1 (does NOT read `run-start.totalBlocks` stub 0; per-block total rides `block-start`), KD-3 (`block-start` clears outputs — replace-on-start), M3 (per-block `executionCount` bump on `block-done` success, not once per `run-done`), S2 (`applyReconnect` resets non-terminal blocks to `idle`).
- `apps/studio/src/execution/useExecution.ts` — hook holding `RunState`; exposes `runBlock`/`runAll`/`cancel` + `blockState(blockId)` selector + `state`. Owns the `runId→blockId(s)` correlation in a `useRef` map, bound from the HTTP-trigger resolution (KD-2) BEFORE any frame arrives, then fed to the reducer as `ctx.runIdToBlocks`. One client + one store per project (KD-1).
- `apps/studio/src/execution/ExecutionClient.ts` — added `onReconnect(cb)` to the interface + implementation; the step-2 `handleClose` now notifies reconnect subscribers (the store needs the socket-close signal to clear stranded blocks — the broadcast WS has no per-client replay). Step-2 behaviour otherwise unchanged; its existing suite stays green.
- `apps/studio/README.md` — new "Execution state" subsection (reducer contract + the four corrections + the hook's KD-2 correlation).

**Tests (TDD — written first, all green):**

- `runStore.test.ts` — single-block lifecycle (queued→running→done), explicit "does NOT read totalBlocks" assertion, output append + truncated flag, block-done success/failure + count, run-cancelled→idle, run-failed→banner+failed, **purity** (same input→same output, input untouched, new object), **run-all CAPSTONE** (full [b1,b2] lifecycle + replace-on-start re-run of b1 bumping count to 2), and reconnect (non-terminal→idle, terminal untouched).
- `useExecution.test.tsx` — **L1 CAPSTONE** (one runId resolved from the trigger threaded unchanged onto the WS frames updates the originating block — not a hardcoded id), run-all binding, cancel forwarding, and **L2 CAPSTONE** (block running under R, socket drops before its terminal frame, reconnect resets it to `idle`).

**Verification (actually run, not deferred to CI):**

- `vitest run` on the three files — 30/30 pass.
- Full studio vitest project — **177/177 pass** (no s2 regression).
- `pnpm --filter @deepnote/studio exec tsc --noEmit` — exit 0.
- `apps-studio-isolation.test.ts` — 4/4 pass, incl. root `tsc -p tsconfig.json --listFilesOnly` naming **zero** `apps/` files and the no-node/no-runtime-value walk over `apps/studio/src` (the new files import `@deepnote/runtime-server/types` type-only).
- `biome check` (after `--write` format) clean on all changed TS; `prettier --check` clean on README; `cspell` (no-gitignore) 0 issues — no new vocabulary needed.

**L1/L2 routing note:** the planner folded the reviewer's two follow-ups (L1 single-runId-binding granularity, L2 reconnect-replay-gap) into this card's scope. Both are now first-class capstone tests here (`useExecution.test.tsx`), not deferred.

**Left for the reviewer** (per executor SKILL — card stays `in_progress`): Code Review Approved, PR-merged, deploy/monitoring/stakeholder/ticket-close, and the "all tests incl. e2e/performance" checklist box — those are review/dispatch-owned. Nothing deferred to a follow-up card; no tech debt created.


## Review Log — cycle 1 (router)

- **Verdict:** APPROVAL (Gate 1 + Gate 2 both PASS), commit `74267c5`.
- **Report:** `.gitban/agents/reviewer/inbox/LUIRUN1-9xfks2-reviewer-1.md`
- **Routing:** Approval → executor close-out (`.gitban/agents/executor/inbox/LUIRUN1-9xfks2-executor-1.md`). No blockers, no non-blocking follow-ups, no backlog items — nothing routed to the planner.
- **Close-out owned here:** set Code Review Approved. PR-merge/deploy/monitoring/stakeholder/ticket-close + the "all tests incl. e2e/performance" box remain dispatch/PR-owned.

