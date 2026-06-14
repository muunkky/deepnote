---
verdict: APPROVAL
card_id: 6iba9v
review_number: 1
commit: b146370
date: 2026-06-13
has_backlog_items: true
---

# Review — LUIRUN1 step 2: ExecutionClient (HTTP trigger + WS subscribe-only stream)

## Verdict: APPROVAL

The SPA's execution transport seam is implemented to a high standard, matches the s1
backend contract exactly, and holds the ADR-006/007 isolation boundary. All three
load-bearing claims verified against running code.

## Gate 1 — Completion claim (PASS)

DoD is present and well-formed. Intent is plain-English and falsifiable. Observables are
user-observable (POST URL, resolved runId, frame delivery, typed rejection), not
implementation-detail. The capstone is genuinely unfakeable: it asserts on the concrete
POST URL `/api/notebooks/nb/blocks/b1/run`, the runId resolved from a real (stubbed-transport)
202, a runId-tagged inbound frame reaching `subscribe`, and a typed `RunTriggerError('queue-full')`
on 429 — none mockable away, all exercised against `globalThis.fetch`/`WebSocket` stubs rather
than stubbed methods on the unit under test. Checkbox design proves correctness if honest.
Checkbox integrity verified — see Gate 2 evidence below.

## Gate 2 — Implementation quality (PASS)

**Verified against the real s1 contract (not the executor's mental model):**

- **Routes match.** `packages/runtime-server/src/router.ts` matches `POST /api/project/run`
  and `BLOCK_RUN_RE = /^\/api\/notebooks\/([^/]+)\/blocks\/([^/]+)\/run$/`, decoding each
  segment with `decodeURIComponent`. The client `encodeURIComponent`s both segments, so the
  round-trip is correct — and because `encodeURIComponent('blk/a b')` → `blk%2Fa%20b` emits no
  literal `/`, the `[^/]+` segment still matches. The URL-encoding test is a genuine contract
  test, not a self-consistent fiction.
- **Status/body shapes match.** `handleRun` returns `202 { runId }`, `429 { error:'queue-full' }`,
  and `500 { error, failureCategory }` (StartEngineError). The client's `triggerRun` branches on
  exactly these three and surfaces `reason` + `failureCategory` + verbatim `error` text accordingly.
- **WS shapes match.** `api-types.ts` defines `WsClientMessage` cancel as `{ type:'cancel'; runId: RunId }`
  (client constructs exactly this), `RunId = number` (so `runIdOf` correctly accepts only numbers),
  and `WsServerEvent` carries the `block-start`/`run-start`/`run-done`/`run-cancelled` shapes the
  stream tests fire.

**(1) KD-2 — runs are HTTP-triggered, WS is subscribe-only.** Confirmed at source: the only
`socket.send` in the client is the `cancel` message (line 232); the `{type:'run'}` variant of
`WsClientMessage` is never constructed. `runBlock`/`runAll` resolve the 202 runId synchronously
via `fetch`. The WS is used only for the inbound broadcast and outbound cancel. This is the
deterministic-correlation design (KD-2's rejected "next un-bound run-start is mine" alternative
is genuinely not present).

**(2) Type-only ADR-006/007 boundary holds.** The sole `@deepnote/runtime-server` import is
`import type { KernelFailureCategory, RunId, WsClientMessage, WsServerEvent }` from the `/types`
subpath. No `node:` builtin, no runtime-core value, no backend runtime value. Transport is the
browser `fetch` + `WebSocket` globals. The isolation test's new ExecutionClient case asserts all
of this behaviourally (type-only + `/types` subpath + positive `new WebSocket(`/`fetch(` guard
against a silent Node-client refactor), and the capstone `tsc -p tsconfig.json --listFilesOnly`
names zero `apps/` files. **Ran it: 4/4 isolation tests pass (6.3s tsc walk included).**

**(3) Capstone is unfakeable and verified.** Ran the suite: **ExecutionClient.test.ts 15/15**,
**full studio suite 162/162**, **studio `tsc --noEmit` clean**, **Biome clean** on all three
changed TS files. The capstone observables are walked against stubbed-but-real transport.

**TDD:** Tests read as specification, not reverse-engineered. Failure/edge cases are first-class
(429, 500+failureCategory, pre-response network, malformed-frame drop, unsubscribe-mid-dispatch,
capped-backoff reconnect, close()-suppresses-reconnect), not happy-path-only. The fake WebSocket
is a real test-driver, not an over-mock of the unit under test.

**Code quality:** Error handling is explicit and typed; `RunTriggerError` restores its prototype
chain for `instanceof` across ES targets. Body parsing is tolerant (a missing/unparseable JSON
body yields a typed error, never a raw SyntaxError). The subscriber set is snapshotted before
dispatch so an unsubscribe during iteration can't perturb it. Reconnect backoff resets on a clean
open and is suppressed after `close()`. `connect()` during an in-flight reconnect correctly queues
a resolver rather than opening a duplicate socket. DRY body-helper extraction is appropriate.
Documentation (README "Execution transport" section) is accurate and cross-links ADR-005/006/007.

## FOLLOW-UP

- **L1 (capstone-walk-granularity, non-blocking, step-3 scope).** The DoD capstone is worded as
  one end-to-end walk (runBlock resolves runId → a *subsequent* frame for *that* runId reaches
  subscribe). The suite proves both halves but in two separate tests with two different clients and
  two hardcoded runIds (trigger resolves `7`; stream delivers frames tagged `3`); no single test
  fires a stream frame carrying the runId a prior `runBlock` returned. This is acceptable at THIS
  layer because the ExecutionClient is deliberately subscribe-only and does not own the
  `runId → blockId` map — correlation is the `runStore`'s job (design Phase 2 / step 3, doc lines
  59/72). The literal trigger→stream correlation belongs in the step-3 runStore tests, where a run
  is triggered and the store binds the returned runId to the originating block. Recommend the
  step-3 card's capstone assert that explicit binding against the same runId across HTTP and WS.

- **L2 (reconnect-replay-gap, documented-not-tested, step-3 scope).** `handleClose` notes the
  broadcast WS has no per-client replay and relies on "the owning store resets in-flight blocks to
  idle on reconnect" — that reset is asserted nowhere in this card (correctly, it's step-3 state).
  Flagging so the planner ensures step 3 has a test for "a terminal event missed across a reconnect
  does not leave a block pending forever," since this client intentionally provides no replay.

## Close-out actions

None blocking. Remaining unchecked card boxes (PR merge, deploy/monitoring/stakeholder/epic-close)
are reviewer/dispatcher-owned or N/A for the fork-only showcase. Moving card to in_progress
(approved).
