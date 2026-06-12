---
verdict: APPROVAL
card_id: hlai4c
review_number: 1
commit: 955c41d
date: 2026-06-12
has_backlog_items: true
---

# Review — hlai4c (step 4A: execute-stream-ws run-serialization queue)

Reviewed the combined card deliverable across the two code commits that make it
up: `71599bf` (net-new `run-queue.ts` + session engine half + server WS/route
wiring + tests) and `955c41d` (this commit — route+fan-out integration test,
README WS contract, session `ServerSession` interface). Both belong to this card.

## Verdict: APPROVAL

This is the biggest, riskiest card in the sprint and it lands well. The
run-serialization seam, the four capstones, both back-pressure regimes, and the
failure-category mapping are all implemented to the design doc verbatim and
proven behaviorally. 45/45 tests pass; `pnpm build` and `check:types-subpath`
are clean; biome is clean on the package. No blockers.

### Gate 1 — completion claim: PASS

The DoD is exemplary. The Intent paragraph is concrete and externally
sanity-checkable ("hit Run on a slow block then a fast one, and the fast run's
output never bleeds into the slow run's"). Four genuine, unfakeable capstones:

- **no-interleave** — two overlapping runs, recorded WS log asserted fully
  ordered by `runId` with run 1's terminal before run 2's first exec event
  (`run-queue.test.ts:166-215`). The mock `runProject` yields via `tick()`
  between blocks, so a re-entrant queue would actually fail this — it is not
  trivially green.
- **guaranteed-terminal (B1)** — in-block break resolves with `failedBlocks>0`,
  drain emits `run-done` (not `run-failed`) and then nothing
  (`run-queue.test.ts:218-251`).
- **kernel-death terminal (KD-5)** — `KernelDiedError` reject → terminal
  `run-failed{kernel-died}`, no `run-done`, consumer does not hang
  (`run-queue.test.ts:254-274`), plus a negative case proving a plain `Error`
  containing the string "kernel-died" maps to `in-block`, not `kernel-died`
  (`:276-287`). The discriminant is genuinely read from the typed instance.
- **M2 structural invariant** — `run-queue-invariant.test.ts` AST-scans every
  non-test source file and asserts `.runProject` appears only in `run-queue.ts`
  (caller) and `session.ts` (pass-through), with a non-vacuity guard. The
  close-out documents a verified negative control (injecting a third reference
  fails the test). This is the real no-interleave guarantee, exactly as the
  design doc frames it.

Checkboxes are testable and cover failure modes, not just the happy path. No
card-structure issues.

### Gate 2 — implementation quality: PASS

- **TDD is real, not test-after.** The test files are the spec: a `RecordingSink`
  with a controllable `bufferedAmount`, deferred promises to hold runs in flight,
  a mock engine that yields control between blocks, failure-first cases (P3,
  kernel-death, non-kernel reject fallback, both back-pressure regimes). Assertions
  are on observable WS-stream behavior, not internals.
- **Back-pressure regime 1** (`run-queue.test.ts:313-357`) asserts production
  *pauses* (block 1 never starts while `bufferedAmount` stays high) and resumes
  on drain — a behavioral pause, not a buffer.
- **Back-pressure regime 2** (`:359-438`) asserts exactly one `{truncated:true}`
  marker past the bound, no stream forwarded after it, and that
  `execute_result`/`error`/`block-start`/`block-done` all survive the flood.
- **Failure-category fidelity** is sourced from typed instances at every seam:
  `session.startEngine` maps `KernelNotRegistered`/`KernelLaunch`/`KernelDied` →
  typed `StartEngineError{failureCategory}`; the queue reads `result.error
  instanceof KernelDiedError` on `block-done` and the reject path before any
  flatten to `.message`. Matches the R5 table.
- **No lazy solves, no security issues** — kernel port never written to the
  socket (the server is the sole `KernelClient` speaker); WS upgrade 404s any
  path but `/api/stream`; malformed client messages are ignored per the s1
  contract.
- **DRY note (not a finding):** `RunCallbacks`/`RunProjectCallbacks` and
  `RunRequest`/`RunProjectRequest` are structurally identical pairs. This is a
  deliberate module-seam decoupling (the queue's `RunProjectTarget` interface vs.
  the session's surface intentionally do not depend on each other), documented in
  the doc comments. Acceptable boundary choice, not duplicated logic.

## FOLLOW-UP

**L1 — `run-start.totalBlocks` is a contract lie (`docs-vs-code`).**
`run-queue.ts:231` always emits `{ type: 'run-start', runId, totalBlocks: 0 }`,
and `run-queue.test.ts:78` codifies `totalBlocks: 0` as correct. But the contract
type advertises the field (`api-types.ts:109`) and the README documents it as a
meaningful value, with the worked example showing `"totalBlocks": 3`
(README "WS event contract" block). A consumer that branches on
`run-start.totalBlocks` to size a progress UI gets `0` for every run, contradicting
the documented `3`. This does not affect any capstone or the card's Intent (the
real per-run count is carried correctly on every `block-start.total`), and the
count is genuinely unknowable before `engine.runProject` is invoked — so it is a
follow-up, not a blocker. Resolution options: (a) drop `totalBlocks` from the
`run-start` shape and update the README/contract, deferring count to `block-start`;
or (b) plumb the executable-block count out of the engine and emit it for real.
Either way the README example should stop showing a value the code never produces.
Failure mode: a downstream progress/percent indicator computed from
`run-start.totalBlocks` is permanently stuck at 0% or divides by zero.

**L2 — dead engine is not reset after mid-run kernel death (`lifecycle-gap`).**
After a `KernelDiedError`, `#runTask` emits the terminal `run-failed` and `#drain`
continues, but `session.#engine` is never set back to `null`
(`session.ts:255` sets it; only `close()` at `:285` clears it). `startEngine()` is
idempotent and returns early on a non-null engine, so the *next* enqueued run calls
`runProject` on a dead engine. The design doc flags exactly this as a "discrete
deliverable in P3" with an explicit "or" — the session marks itself needing
re-`start()`, or the server surfaces a fatal state — so it is loosely specified and
outside this card's proven scope. The terminal-event guarantee (the actual DoD)
still holds: a subsequent run on the dead engine rejects again and produces another
terminal `run-failed`, so it degrades to repeated kernel-died terminals rather than
a hang. Worth a card: decide between auto-resetting the engine (re-`start()` on next
run) vs. transitioning the session to an explicit fatal state, and test the
second-run-after-death path. Failure mode today: every run after the first kernel
death silently re-fails with `kernel-died` instead of attempting a fresh kernel.

**L3 — `wsLowWaterMark`/`drainPollMs` are unreachable from `createServer`
(`config-surface-gap`).** `RunQueueOptions` exposes both, but
`createServer` only threads `runQueueDepth` and `wsHighWaterMark` into the
`RunQueue` (`server.ts:111-114`). The cross-block drain low-water mark and poll
interval are therefore hardcoded to their defaults (0 / 5ms) in any real server.
Fine for s1 (defaults are sensible and the queue-level tests inject these
directly), but if a future deployment needs to tune the drain behavior there is no
public lever. Low priority. Failure mode: an operator wanting to drain to a
non-zero low-water mark (e.g. to avoid thrashing on a chatty socket) has no
config path short of constructing the queue by hand.

## Outstanding close-out actions (non-blocking)

- The card's `API contract reviewed/approved by team`, production-deploy,
  monitoring, and client-comms checkboxes are honestly left unchecked — correct
  for a wedge-internal package; not executor deliverables.
- Real-kernel API↔`deepnote run` parity is explicitly step 5's integration suite,
  not this card. The mocked suites here prove the queue/adapter/route/WS wiring and
  ordering, which is the right scope for 4A.
