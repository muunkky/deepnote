# Design Doc: Live execution — run blocks with live streamed output (m3/s3)

> **ADR**: [ADR-005](../adr/ADR-005-browser-kernel-transport-proxy.md) (proxy transport) · **PRD**: [PRD-003](../prds/PRD-003-local-deepnote-ui.md) Phase P3 / Scenario 2 · **Roadmap**: `m3/s3/live-execution` · **Date**: 2026-06-13 · **Author**: CAMERON
>
> Builds on the shipped s1 backend ([m3-s1 design](./m3-s1-server-api-and-serve.md)) and the s2 read-only viewer ([m3-s2 design](./m3-s2-viewer.md)). Fork-only showcase (`apps/studio`), per #162.

## Overview

The m3/s2 viewer renders a `.deepnote` project read-only: it fetches `GET /api/project`, dispatches each block through the `BlockRenderer` registry, and renders **persisted** `block.outputs` through the `OutputRenderer`/MIME registry. The s1 backend already ships the other half — a single server-wide `RunQueue` over one `ExecutionEngine`/kernel, `POST` run routes, and a `WS /api/stream` broadcast of an ordered, `runId`-tagged `WsServerEvent` stream (ADR-005's proxy transport). **What does not exist is the wire between them in the browser**: the SPA cannot trigger a run, cannot consume the live event stream, and renders only the outputs frozen in the file.

This design adds the live-execution loop. After it: a **Run** affordance on each runnable block (and a **Run all**) sends a `run` message over the WebSocket; the SPA consumes the `run-queued → run-start → block-start → output* → block-done → run-done` stream; live outputs **replace** the persisted ones in-place through the _same_ `OutputRenderer` the viewer already uses; per-block execution state (idle/queued/running/done/failed) and execution counts are tracked and shown; and the s1 typed failure categories (`run-failed`/`block-done.failureCategory`) surface as **actionable banners and in-place tracebacks**, not blank cells. Per ADR-005 the SPA speaks only the small app-level event contract — never the Jupyter protocol — and the kernel port never reaches the page.

The load-bearing constraint, inherited from ADR-005 and ADR-006/007: this is the **first runtime (non-type) interaction** the SPA has with the backend (a browser `WebSocket` to a localhost URL). It must stay inside the isolation boundary — the _types_ come from `@deepnote/runtime-server/types`, the _transport_ is the browser-native `WebSocket` API, and **no `@deepnote/runtime-server`/`runtime-core` runtime value is imported**. The backend's repo-wide typecheck/lint/spell gate must stay green; `tsc -p tsconfig.json --listFilesOnly` must still name zero `apps/` files.

## Requirements

The implementation is complete when:

- **R1 — Live loop.** Clicking Run on a code/sql block (or Run-all) triggers execution over `WS /api/stream` and the block's outputs stream into the rendered notebook **in place, with no page reload**. On the reference workload (warm kernel, stdout line + a 5-row `df.head()` HTML table) the first output appears **< 2 s** (ADR-005 predicts tens-to-low-hundreds of ms; > ~500 ms repeatedly is the signal to suspect the SPA layer).
- **R2 — Streaming replaces persisted.** During and after a run, the block renders its **live** outputs (the `output` events for its `blockId`), replacing the persisted `block.outputs`, through the existing `OutputRenderer`/MIME registry — no second output renderer.
- **R3 — Execution state + counts.** Each runnable block shows its execution state (idle / queued / running / done / failed) driven by the `run-queued`/`block-start`/`block-done`/`run-done` lifecycle, and an execution count that increments once per completed run of that block.
- **R4 — Failure-category fidelity.** A missing kernel, a launch failure, a mid-run kernel death (`run-failed` + `KernelFailureCategory`), and an in-block exception (`block-done.success=false` with a traceback `error` output) each surface distinguishably: an **actionable banner** for kernel/launch/death failures (e.g. "deepnote-toolkit not installed — `pip install 'deepnote-toolkit[server]'`"), and an **in-place traceback** (via the existing `ErrorRenderer`) with the block marked failed for an in-block exception. No failure renders as a blank cell or a run stuck pending forever.
- **R5 — Ordered, no-drop consumption.** The SPA applies events in `runId` + arrival order with no dropped/reordered application; a `run` whose `runId` is superseded or `run-cancelled` is reconciled cleanly; the within-block back-pressure `{ truncated: true }` marker renders a visible "output truncated" affordance rather than being silently ignored.
- **R6 — Isolation preserved.** The SPA imports the WS protocol **type-only** from `@deepnote/runtime-server/types`; it imports no backend runtime value and no `node:` builtin; root `tsc -p tsconfig.json --listFilesOnly` names zero `apps/` files; no `packages/*` gains a frontend dependency. The `api-types-no-runtime-import` and `apps-studio-isolation` invariants stay green.
- **R7 — Read-only crossing is deliberate and contained.** The Run controls are the **only** new mutating affordance; the viewer's other read-only invariants (inputs/button stay inert, no editing yet) are unchanged. Editing + save is s4; reactive re-run is s5 — explicitly out of scope here.

## Current State

**SPA (s2, shipped in `apps/studio`):**

- `src/api/fetchProject.ts` — `fetchProject(baseUrl): Promise<ApiProject>` (read-only GET).
- `src/state/projectStore.ts` — `{ status: 'loading' } | { status: 'loaded'; project; capabilities; activeNotebookId } | { status: 'error'; error }`. **No execution state.**
- `src/shell/{App,Shell,NotebookList,NotebookView}.tsx` — fetch container → shell → notebook list + active notebook pane; `NotebookView` renders `blocks[]` in persisted order via `BlockRenderer`.
- `src/blocks/BlockRenderer.tsx` — the type-keyed registry (`code`, `sql`, markdown/text, viz/big-number/image, input-\*/button/separator, `default`). `CodeRenderer`/`SqlRenderer` render the source + **persisted** `block.outputs` via `OutputRenderer`. **No run control.**
- `src/outputs/OutputRenderer.tsx` + `mime/*` — renders an `IOutput[]` (stream/display_data/execute_result/error) with the rich-first MIME registry; `ErrorRenderer` renders ename/evalue + traceback. **Driven by persisted outputs only.**
- The only backend dependency is **type-only** (`import type { ApiProject, IOutput, … } from '@deepnote/runtime-server/types'`); the only network call is the `GET` fetch.

**Backend (s1, shipped in `packages/runtime-server`):**

- One server-wide `RunQueue` over one `ExecutionEngine`/kernel (one kernel ⇒ one engine ⇒ one queue).
- `POST /api/project/run` (run-all) and `POST /api/notebooks/{nb}/blocks/{id}/run` (single-block) → `202 { runId }` or `429 { error: 'queue-full' }`; engine-start failure → `500 { error, failureCategory }`.
- `WS /api/stream` — broadcasts the ordered `runId`-tagged `WsServerEvent` stream to all subscribers; accepts `WsClientMessage` (`run`/`cancel`).
- `WsServerEvent` / `WsClientMessage` / `FailureEvent` / `OutputEvent` / `RunId` / `KernelFailureCategory` are defined in `packages/runtime-server/src/api-types.ts` and re-exported from the Node-free `/types` entry.

## Target State

```
                         apps/studio (browser SPA, fork-only)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  App (fetch GET /api/project)  ──►  Shell  ──►  NotebookView               │
  │                                                   │                        │
  │                                                   ▼                        │
  │                                    BlockRenderer (registry dispatch)       │
  │                                       │                  ▲                 │
  │                              CodeRenderer/SqlRenderer     │ live outputs    │
  │                                  │  [Run ▶]               │ + run state     │
  │                                  ▼                        │                 │
  │            runStore  ◄───────────┴───────────────────────┘                 │
  │            (per-block exec state, counts, runId↔block map, live outputs)    │
  │                 ▲                         │ {type:'run', blockId}            │
  │   WsServerEvent │  (run-queued/start/     ▼                                 │
  │   (type-only)   │   block-*/output/done/  ExecutionClient                   │
  │                 │   run-failed/cancelled) (browser WebSocket → /api/stream) │
  └─────────────────┼───────────────────────────────┼──────────────────────────┘
                    │                                │  ws:// localhost:<port>/api/stream
  ──────────────────┼────────────────────────────────┼──────────────────────────
   @deepnote/runtime-server (Node, packages/*)        ▼
   WS /api/stream  ◄────────────────────────────►  RunQueue → ExecutionEngine → KernelClient → Jupyter kernel
   (broadcast, ordered, runId-tagged)                (one kernel; ADR-005 proxy)
```

After all phases: the same viewer, now with a Run affordance per runnable block and a Run-all; an `ExecutionClient` owning the single `WS /api/stream` connection; a `runStore` correlating `runId → blockId` and holding per-block execution state, counts, and live outputs; `CodeRenderer`/`SqlRenderer` rendering live outputs (falling back to persisted when a block has never been run this session); and failure banners + in-place tracebacks driven by the typed failure events. The SPA still imports the backend type-only; the kernel port is never reached from the page.

## Design

### Architecture

Three new modules plus targeted edits to the renderers, all under `apps/studio/src`:

1. **`src/execution/ExecutionClient.ts`** — owns the single `WebSocket` to `/api/stream`. Sends `WsClientMessage`; receives `WsServerEvent`; exposes a typed subscribe callback and a `run(blockId?)`/`cancel(runId)` API. Connection lifecycle (open/close/reconnect-with-backoff), JSON framing, and ordered delivery live here. The browser-native `WebSocket` constructor is the _only_ runtime backend touchpoint; every message is typed against `@deepnote/runtime-server/types` (`import type`).
2. **`src/state/runStore.ts`** — the execution state reducer. Folds `WsServerEvent`s into a `RunState`: a `runId → { blockIds, status }` map, a per-block `BlockRunState` (status + live `IOutput[]` + execution count + failure), and a server-wide kernel-failure banner. Pure reducer (`applyEvent(state, event) → state`) so it is unit-testable without a socket.
3. **`src/execution/useExecution.ts`** (hook) — wires `ExecutionClient` ⇄ `runStore` ⇄ React: holds the `RunState`, exposes `runBlock(blockId)` / `runAll()` / `cancel(runId)` and per-block selectors. One client + one store per loaded project (the backend has one queue/kernel, so one client is correct).

Renderer edits (additive, registry seam unchanged):

- `CodeRenderer`/`SqlRenderer` gain a **Run** control and consume the block's run state: if the block has a live run this session, render its live `IOutput[]` (+ a running spinner / exec count); else render persisted `block.outputs` (today's behaviour). The output sink is the **same** `OutputRenderer` — R2.
- A new `src/execution/RunControl.tsx` (the inert-until-clicked Run button + state pill) and `src/execution/KernelBanner.tsx` (the actionable failure banner) — small presentational components.
- `NotebookView`/`Shell` gain a **Run all** control and host the `KernelBanner`.

### Key Design Decisions

**KD-1 — One `ExecutionClient`/one `runStore` per project, not per block.** The backend is a single queue over a single kernel (ADR-005): all runs serialize through one connection and every event is `runId`-tagged on one broadcast socket. The natural mirror is one client owning one socket and one store folding all events, with `runId → blockId` correlation done centrally. _Alternative:_ a socket or subscription per block — rejected because it fragments the one ordered stream into N consumers that must each filter by `blockId` and re-derive ordering, and because the back-pressure/`run-cancelled`/kernel-death events are run- and server-scoped, not block-scoped. _Price:_ the store is a small central reducer every renderer subscribes to (a selector indirection) rather than block-local state.

**KD-2 — Trigger runs over the HTTP routes (which return the `runId` synchronously); the WebSocket is a subscribe-only event stream filtered by owned `runId`s.** The SPA must map a streamed `runId` back to the block(s) it ran. Decision: trigger via `POST /api/notebooks/{nb}/blocks/{id}/run` (single block) and `POST /api/project/run` (run-all), which return `202 { runId }` (or `429 { error:'queue-full' }`, or `500 { failureCategory }`). The SPA binds `runId → blockId(s)` **at the moment of the request**, deterministically, before any event arrives — then consumes the broadcast `WS /api/stream` purely as a subscribe-only stream, **filtering by the set of `runId`s it owns** (ignoring other subscribers' broadcast events). `cancel(runId)` uses the WS `{type:'cancel', runId}` with the now-known `runId`.

_Alternatives rejected:_ (a) trigger via the WS `run` message — rejected because `server.ts` discards the enqueue result, so the WS `run` returns **no** `runId` to the sender (the `runId` appears only in the _broadcast_ events), forcing a fragile "next un-bound `run-queued`/`run-start` is mine" inference; that inference breaks under two browser tabs (the WS is a broadcast — every subscriber is a producer), under rapid back-to-back runs racing the binding, and on the P1/idle path (an idle run emits **no `run-queued`** — `RunQueue.enqueue` P1 drains straight to `run-start` — so there is nothing to bind to and no way to show a `queued` state). (b) infer the block from `block-start.blockId` only — rejected for run-all (many blocks, one `runId`) and because it shows nothing until the first `block-start`. _Price:_ the trigger is two protocols (HTTP to start, WS to stream) rather than one — but this is exactly the ADR-005 split ("HTTP carries the discrete request/response operations… `POST …/run`; the WebSocket carries the asynchronous event stream"), and it makes correlation structurally correct rather than assumption-dependent (no single-producer assumption, multi-tab-safe by construction).

**KD-3 — Live outputs _replace_ persisted, per block, scoped to the session.** A block's rendered outputs are: its **live** `IOutput[]` if it has been run this session (even mid-run, accumulating), else its **persisted** `block.outputs`. The replacement is per-block and in-memory only — s3 does **not** write live outputs back to the file (that is s4 save). _Alternative:_ merge/append live onto persisted — rejected because a re-run's outputs supersede the old ones (Jupyter semantics: a fresh execution clears the cell's prior output), so replace-on-run-start is correct. _Price:_ a reload (re-fetch) drops session live outputs back to persisted — acceptable and expected for a no-save story.

**KD-4 — The Run control is the deliberate, contained crossing of s2's read-only boundary.** s2 shipped a strictly read-only viewer (R8: inputs/buttons inert, no mutation). s3's Run button is the **first** intentional mutating affordance and the _only_ one this story adds — inputs/button stay inert, no text editing (s4). The isolation test that forbade mutating controls is scoped so the new Run/Run-all controls are the explicit, tested exception, not a regression. _Alternative:_ a global "run mode" toggle gating all interactivity — rejected as over-built for one affordance (KD-4 "take the long route" applies to correctness, not ceremony). _Price:_ the read-only-invariant test grows an allowlist of exactly the run affordances.

**KD-5 — Failure events drive two distinct surfaces by category.** `run-failed` / engine-start `500 { failureCategory }` (categories `missing-kernel`/`kernel-launch`/`kernel-died`) → a **server-level `KernelBanner`** with an actionable message and remediation; `block-done.success=false` with an `error` `IOutput` (an in-block exception) → an **in-place traceback** via the existing `ErrorRenderer` + the block marked failed. _Alternative:_ one generic "run failed" toast — rejected because it fails R4/the PRD's failure-category-fidelity criterion (the whole point is the user can tell "install the toolkit" from "your code threw"). _Price:_ the failure mapping is a small typed switch on `KernelFailureCategory` that must stay in sync with the backend enum (caught by the type-only import — adding a category is a compile error here until handled).

**KD-6 — Capability-gated Run.** `ApiProject.capabilities.kernelLanguage === null` (no kernel) disables the Run controls and shows the "no kernel" affordance up front (KD-6 from s2), rather than letting a run fail and then explaining. _Price:_ none meaningful — it reuses the capability flag the viewer already has.

### Interface Design

**`ExecutionClient` (`src/execution/ExecutionClient.ts`):**

```ts
import type {
  WsClientMessage,
  WsServerEvent,
  RunId,
} from "@deepnote/runtime-server/types";

export interface ExecutionClient {
  /** Connect the subscribe-only event socket (idempotent); resolves once the socket is OPEN. */
  connect(): Promise<void>;
  /** Trigger a single-block run via POST .../blocks/{id}/run; resolves with the server runId (202),
   *  or rejects with a typed RunTriggerError carrying queue-full (429) / failureCategory (500). */
  runBlock(blockId: string, notebookName: string): Promise<RunId>;
  /** Trigger a whole-project run-all via POST /api/project/run; resolves with the single runId. */
  runAll(): Promise<RunId>;
  /** Cancel a queued run (WS), using a runId obtained from runBlock/runAll. */
  cancel(runId: RunId): void;
  /** Subscribe to the ordered server event stream (the broadcast WS); returns an unsubscribe.
   *  The caller filters to the runIds it owns. */
  subscribe(onEvent: (event: WsServerEvent) => void): () => void;
  /** Connection state for the UI. */
  readonly status: "idle" | "connecting" | "open" | "closed";
  close(): void;
}
// Trigger = HTTP POST (returns the runId directly, KD-2); stream = WS subscribe-only.
// baseUrl → ws URL: http(s)://host → ws(s)://host + '/api/stream'. Reconnect with capped backoff.
// Malformed frame (JSON.parse throw) is dropped, not fatal (mirrors the server's tolerant handler).
// On socket close with runs in flight (S2): the owning store marks all non-terminal owned blocks
// `idle` and clears their spinners — the broadcast has no per-client replay, so a missed terminal
// event must not leave a block pending forever.
```

**`runStore` (`src/state/runStore.ts`) — pure reducer:**

```ts
export type BlockRunStatus = "idle" | "queued" | "running" | "done" | "failed";
export interface BlockRunState {
  status: BlockRunStatus;
  outputs: IOutput[]; // live, accumulating; replaces persisted while present
  executionCount: number; // increments on each run-done that completed this block
  truncated: boolean; // a {truncated:true} marker arrived for this block
  failureCategory?: KernelFailureCategory;
}
export interface RunState {
  byBlock: Record<string, BlockRunState>;
  runs: Record<
    RunId,
    {
      blockIds: string[];
      status: "queued" | "running" | "done" | "failed" | "cancelled";
    }
  >;
  kernelBanner?: { category: KernelFailureCategory; message: string }; // server-level failure (R4)
}
export const initialRunState: RunState;
export function applyEvent(
  state: RunState,
  event: WsServerEvent,
  ctx: { runIdToBlocks: Map<RunId, string[]> },
): RunState;
```

Event → state mapping (the contract the reducer test pins): `run-queued` → mark the pending block(s) `queued`; `run-start` → mark the run `running` (**do not** read `run-start.totalBlocks` — the backend emits it as a stub `0`; the real per-block `total` arrives on each `block-start`, S1); `block-start` → that block `running`, **clear its outputs** (replace-on-start, KD-3), and record `index`/`total` for progress; `output` (normal) → append `IOutput`; `output` (`truncated:true`) → set `truncated`; `block-done` → that block `done`/`failed` by `success`, set `failureCategory` if present, and **bump that block's `executionCount`** on success (per-block, on `block-done` — _not_ once per `run-done`, since a run-all completes many blocks under one `run-done`, M3); `run-done` → finalize the run; `run-failed` → set `kernelBanner` from `failureCategory`/`message`, mark in-flight blocks `failed`; `run-cancelled` → mark queued blocks `idle`. **Reconnect (S2):** on socket close with non-terminal owned blocks, mark them `idle` and clear spinners (no replay — a missed terminal must not leave a block pending forever).

**Renderer prop extension (additive):** `CodeRenderer`/`SqlRenderer` accept an optional `run?: { state: BlockRunState; onRun: () => void; canRun: boolean }`; absent → today's persisted-only behaviour (keeps the components testable without the store and preserves the s2 tests).

## Implementation Phases

Four phases, mapping to the project's four features. Each is independently testable; the loop is end-to-end only after Phase 4, but every phase ships green tests + isolation invariant.

### Phase 1: ExecutionClient — the type-safe transport seam (HTTP trigger + WS stream)

**Goal:** the SPA can trigger a run via the HTTP `POST …/run` routes (getting the `runId` back, KD-2), subscribe to the typed `WsServerEvent` broadcast over `WS /api/stream`, and `cancel` over the WS — staying type-only against the backend.

**Deliverables:** `src/execution/ExecutionClient.ts` (+ `.test.ts`) — `runBlock`/`runAll` (HTTP POST → `RunId`, with a typed `RunTriggerError` for `429`/`500`), `subscribe` (WS, subscribe-only), `cancel` (WS), `connect`/`close`; ws-URL derivation helper; the isolation test extended to assert the new file imports the WS/HTTP types **type-only** and uses only browser globals (`fetch`, `WebSocket`) — no backend runtime import, no `node:`.

**Test strategy (TDD — tests first):** write the failing unit tests before the client: a stubbed `fetch` returns `202 {runId}` / `429` / `500 {failureCategory}` and `runBlock`/`runAll` resolve the `runId` or reject with the typed error; a fake `WebSocket` drives connect→OPEN, an inbound frame deserializes to `WsServerEvent` and reaches `subscribe`, a malformed frame is dropped, `cancel` serializes the exact `{type:'cancel',runId}` JSON, reconnect-with-backoff fires on close. **Boundary test (written first):** AST/grep assert no value import from `@deepnote/runtime-server`/`runtime-core`.

**Documentation:** `apps/studio/README.md` "Execution transport" section (HTTP-trigger + WS-stream split, the app-level contract, the type-only boundary, ADR-005 link).

**Dependencies:** s1 backend (done); s2 type-only boundary (done).

**Definition of done:**

- [ ] `runBlock`/`runAll` trigger via `POST …/run` and resolve the server `runId` (or reject typed on 429/500); `subscribe`/`cancel`/`connect`/`close` implemented; unit suite green (tests written first).
- [ ] HTTP + WS messages typed against `@deepnote/runtime-server/types`; **no** backend runtime value or `node:` import.
- [ ] `apps-studio-isolation` test extended + green; root `tsc --listFilesOnly` names 0 `apps/` files.

### Phase 2: runStore + useExecution — execution state model

**Goal:** `WsServerEvent`s fold into per-block execution state, counts, and the `runId↔block` correlation, exposed to React.

**Deliverables:** `src/state/runStore.ts` (pure `applyEvent` reducer + `.test.ts`); `src/execution/useExecution.ts` hook (+ `.test.tsx`) wiring client⇄store; the `runId→blockId` correlation (KD-2).

**Test strategy:** unit — the reducer pinned against a scripted event sequence for both single-block and run-all: `queued→running→done` transitions, `executionCount` increments once per run, replace-on-`block-start`, `{truncated:true}` sets the flag, `run-failed`/`run-cancelled` transitions, ordered application. Hook test — a fake `ExecutionClient` feeds events; `runBlock`/`runAll` send the right messages; selectors return the right `BlockRunState`.

**Documentation:** README "Execution state" subsection (the `BlockRunState` lifecycle + replace-on-run semantics).

**Dependencies:** Phase 1.

**Definition of done:**

- [ ] `applyEvent` covers every `WsServerEvent` variant; reducer suite green (incl. truncation + failure + cancel).
- [ ] `useExecution` exposes `runBlock`/`runAll`/`cancel` + selectors; hook suite green.
- [ ] `runId→blockId` correlation tested for single-block and run-all.

### Phase 3: Run affordances + live output rendering

**Goal:** a Run control on code/sql blocks and a Run-all; live outputs render in place through the existing `OutputRenderer`, replacing persisted while a session run exists.

**Deliverables:** `src/execution/RunControl.tsx` (+ test); `CodeRenderer`/`SqlRenderer` consume the optional `run` prop (live-vs-persisted output selection, running spinner, exec count); `NotebookView`/`Shell` host **Run all** + wire `useExecution`; capability-gated disable (KD-6); the read-only-invariant test allowlists exactly the run affordances (KD-4).

**Test strategy:** component (jsdom + RTL) — clicking Run sends a `run` for the block (fake client asserts the message); a streamed `output` event renders through `OutputRenderer` in place; a re-run **replaces** prior live output; persisted output still renders for a never-run block (s2 regression); Run is **disabled** when `kernelLanguage === null`; the isolation/read-only test confirms no _other_ mutating control appeared.

**Documentation:** README "Running blocks" (Run / Run-all, live-vs-persisted, capability gating).

**Dependencies:** Phase 2; reuses s2 `OutputRenderer` unchanged (R2).

**Definition of done:**

- [ ] Run + Run-all controls render and dispatch the correct `run` messages.
- [ ] Live outputs render through the existing `OutputRenderer`; replace-on-run-start holds; never-run blocks still show persisted output.
- [ ] Run disabled with no kernel; read-only-invariant test green with the run-affordance allowlist.

### Phase 4: Failure surfacing, traceback, and the < 2 s measurement (capstone)

**Goal:** every failure category surfaces correctly, in-block tracebacks render in place, and the live loop is measured end-to-end against a real kernel under the < 2 s bar.

**Deliverables:** `src/execution/KernelBanner.tsx` (actionable banner keyed on `KernelFailureCategory`, +test); failure-category → surface mapping (KD-5); in-block exception → `ErrorRenderer` traceback + block marked failed; a `block-done`/`run-failed` "stuck-pending" guard (R4: a run never hangs visually); an **integration measurement** of the live loop against the repo-root `.venv` (`deepnote-toolkit[server]`) recording the edit→output latency on the reference workload, gated out of the always-on suite (like the s2 HMR e2e).

**Test strategy:** component — each `KernelFailureCategory` maps to its banner with the right remediation text (missing-kernel → the `pip install` message); an in-block `error` output renders ename/evalue + traceback via `ErrorRenderer` and marks the block failed; a `run-failed` after `block-start` clears the pending state (no infinite spinner). **Capstone (integration, gated):** boot a real `deepnote serve` against a fixture project, drive a single-block run over the live WS, assert the streamed output appears and record the measured latency (< 2 s on a warm kernel; report the number — ADR-005's revisit signal is > ~500 ms repeatedly).

**Documentation:** README "Failure handling + performance" (the category → surface table; how to run the gated latency measurement).

**Dependencies:** Phase 3.

**Definition of done:**

- [ ] Each `KernelFailureCategory` renders its distinct, actionable banner; mapping test green.
- [ ] An in-block exception renders its traceback in place and marks the block failed; no run hangs pending.
- [ ] Gated integration measurement runs the live loop against a real kernel and records edit→output latency under the < 2 s bar on the reference workload.
- [ ] Full studio suite + isolation invariant green; backend repo-wide gate unaffected.

## Migration & Rollback

**Migration:** pure addition to `apps/studio` (fork-only). No backend change — s1 already ships every route/event this consumes. No schema or persisted-format change (s3 does not write outputs back; that is s4). The s2 read-only behaviour is preserved for never-run blocks, so a project that is opened-but-not-run renders exactly as before.

**Rollback:** clean `git revert` of the s3 commits restores the read-only viewer; no migration ran, no data changed, the backend is untouched. The `ExecutionClient` opens a socket only when the project loads with a kernel — reverting removes the only live backend interaction.

## Risks

| Risk                                                                                                                  | Impact                                                      | Likelihood                            | Mitigation                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `runId↔block` correlation wrong under run-all / rapid runs / multi-tab                                               | live outputs attach to the wrong block                      | ~~Medium~~ **Structurally prevented** | KD-2 (revised): the `runId` is obtained synchronously from the HTTP `POST …/run` and bound to its block(s) at request time; the SPA filters the broadcast WS by _owned_ `runId`s. No single-producer assumption; multi-tab-safe by construction. |
| The Run control re-opens the read-only boundary too widely (a renderer gains an editing/mutating control by accident) | s2's R8 invariant silently regresses                        | Medium                                | KD-4: run affordances are an explicit allowlist in the read-only-invariant test; everything else must stay inert (test fails otherwise).                                                                                                         |
| A runtime value sneaks in from `@deepnote/runtime-server`/`runtime-core` via the WS client                            | breaks ADR-006/007 isolation; reddens backend gate          | Medium                                | Phase-1 boundary test asserts type-only; `api-types-no-runtime-import` + `apps-studio-isolation` stay green; root `--listFilesOnly` = 0 apps/.                                                                                                   |
| Live loop fails the < 2 s bar in the real UI (proxy overhead after all)                                               | PRD's load-bearing criterion missed; ADR-005 revisit signal | Low                                   | ADR-005 spike predicts ~62 ms; Phase-4 measures early against the real kernel and reports the number; > ~500 ms repeatedly triggers re-measurement of the SPA layer.                                                                             |
| Back-pressure `{truncated:true}` marker ignored → user thinks output is complete                                      | misleading truncated output                                 | Low                                   | R5: reducer sets `truncated`; renderer shows a visible "output truncated" affordance; tested.                                                                                                                                                    |
| Kernel dies mid-run and the SPA hangs pending                                                                         | block spins forever (the exact ADR-005 negative)            | Medium                                | R4 + Phase-4 stuck-pending guard: `run-failed`/`block-done` always clears pending; tested with a simulated mid-run `run-failed`.                                                                                                                 |

## Roadmap Connection

Advances **`m3/s3` "Run blocks with live streamed output"** (project `live-execution`, 4 features) — the four phases map 1:1 to the four features (WS transport, state model, run affordances + live rendering, failure surfacing + measurement). Depends on `m3/s1` (backend, done) and `m3/s2` (viewer, done). Sets up `m3/s4` (edit + save — which will persist live outputs back to the file) and `m3/s5` (reactive re-execution — which reuses this client/store to fan dependent runs). On acceptance, set `docs_ref` on `m3/s3/live-execution` to this doc.

## Open Questions

_(The three original open questions were resolved against the s1 backend code during design review and folded into the design: run-all is one `runId` spanning blocks — `RunQueue.enqueue` assigns one `runId` per request, run-all has no `blockId` — KD-2/M1; run-all via `POST /api/project/run` is whole-project, there is no active-notebook-only route in s1 — M2; reconnect-mid-run resets in-flight owned blocks to `idle` with no replay — S2, now a tested Phase-1/2 contract rather than an open question.)_

1. **`run-start.totalBlocks` stub.** The backend emits `run-start` with `totalBlocks: 0` (the engine does not pre-count); the SPA must take the block count from `block-start.total`. Captured as the reducer contract (S1) — flagged here only so a future backend that _does_ pre-count `totalBlocks` is a deliberate change, not a silent reinterpretation.

---

## Revision History

| Date       | Author  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-06-13 | CAMERON | Initial design — live execution over the ADR-005 proxy WS, four phases mapping to the `live-execution` features. Proposal for adversarial review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-13 | CAMERON | Adversarial-review pass (verdict: Request Changes — direction approved, mechanism fix). **B1:** trigger runs via the HTTP `POST …/run` routes (return `202 {runId}` synchronously) and treat the WS as subscribe-only filtered by owned `runId`s — deletes KD-2's fragile FIFO single-producer correlation, multi-tab-safe by construction. **S1:** block count comes from `block-start.total`, not the stub `run-start.totalBlocks:0`. **S2:** reconnect resets in-flight owned blocks to `idle` (tested contract). **M1/M2/M3:** run-all = one `runId` (whole project); per-block `executionCount` on `block-done`. Open questions 1–3 resolved against the s1 backend code. |
