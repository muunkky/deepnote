---
verdict: APPROVAL
card_id: 9xfks2
review_number: 1
commit: 74267c5
date: 2026-06-13
has_backlog_items: false
---

# Review: runStore reducer + useExecution hook (LUIRUN1 step 3)

## Verdict: APPROVAL

Gate 1 (completion claim) and Gate 2 (implementation quality) both pass. The card carries a
well-formed DoD with a plain-English Intent, three unfakeable capstones (full lifecycle,
single-runId binding L1, reconnect-strand L2), and checkboxes that genuinely prove correctness.
The implementation matches the design contract exactly, the tests are TDD-shaped (contract-first,
edge cases, purity, real end-to-end capstones), and all green claims verify.

## Gate 1 — completion claim: PASS

- **DoD required and present.** This card touches control flow, a public hook API, and a reducer
  contract — a DoD is mandatory and the card has a strong one.
- **Intent** is concrete and outside-the-code ("each block lights up in order, output accumulates,
  count tracks per session; breakage = wrong state / mis-attributed output / drifting count"). A
  reasonable engineer can sanity-check against it.
- **Capstones are unfakeable.** Three capstones, each asserting on observable assembled behaviour:
  - Lifecycle capstone: a real [b1,b2] run-all event sequence yields per-block `done` + streamed
    outputs + `executionCount:1`, and a b1 re-run clears prior outputs and bumps to 2.
  - L1 correlation capstone: ONE runId resolved from the trigger is threaded unchanged onto WS
    frames and updates the originating block — not two hardcoded ids. This pins the exact seam the
    step-2 ExecutionClient deliberately does not own.
  - L2 reconnect-strand capstone: a block running under R, socket drops before its terminal frame,
    reconnect resets it to idle. Genuinely exercises the missed-terminal path.
  None are tickable by a single isolated unit test or mock; each walks assembled behaviour.
- **Checkbox integrity verified.** Every checked acceptance/observable box corresponds to a real
  test I ran and confirmed green.

## Gate 2 — implementation quality: PASS

**Verified by running the actual code at commit 74267c5** (the executor's worktree is intact; the
files are not on the current HEAD, which sits at the parent commit ed8718e):
- New tests: `runStore.test.ts` + `useExecution.test.tsx` — **15/15 pass**.
- Full studio vitest project — **177/177 pass** (no step-2 regression).
- `tsc --noEmit` — **exit 0** (confirms the type-only import boundary holds).

**Contract conformance — checked against `docs/designs/m3-s3-live-execution.md` Phase 2 and the
`WsServerEvent` union in `packages/runtime-server/src/api-types.ts`:**
- The reducer's `switch` handles every one of the 8 union variants (run-queued, run-start,
  block-start, OutputEvent's two shapes via one `output` case, block-done, run-done, run-failed,
  run-cancelled) with a `never` exhaustiveness default — a new backend variant becomes a compile
  error until handled. Matches the union exactly.
- The four design-review corrections are each implemented AND individually pinned by a test:
  S1 (does not read the `run-start.totalBlocks` stub 0), KD-3 (block-start clears outputs),
  M3 (per-block executionCount bump on block-done success, not once per run-done), S2
  (`applyReconnect` resets non-terminal blocks to idle).

**Architecture / correctness assessment:**
- **Purity** is real and tested: `applyEvent` returns new objects, never mutates input
  (`patchBlock`/`patchRun` spread; the purity test asserts `before` untouched and `a !== before`).
- **KD-2 correlation** is correct: `useExecution` binds `runId -> blockId(s)` synchronously at the
  trigger resolution into a `useRef` Map (no re-render, current the instant a frame arrives), and
  hands the *same* Map reference into the reducer via `ctx`. Because `bind()` mutates the Map in
  place rather than replacing it, the long-lived `ctx` captured in the subscribe effect always sees
  live bindings. This is the right call and is documented inline.
- **Idle/P1 path** handled correctly: `run-start` marks only the run running (not blocks), so an
  idle run that skips `run-queued` produces no spurious `queued` flash; the block transitions at its
  `block-start`. Matches design KD-2's idle-path note.
- **Defensive seeding**: an `output` or terminal event arriving before its `block-start` seeds via
  `freshBlockState()` rather than crashing — sensible for an ordered-but-not-guaranteed broadcast.
- **DaC**: the README "Execution state" subsection documents the full event->state contract
  including all four corrections and the hook's correlation model. Truthful and complete.
- **Step-2 seam**: `ExecutionClient` gains `onReconnect()` cleanly (additive to the interface +
  impl; `handleClose` now notifies before backoff). Step-2 behaviour otherwise unchanged; its suite
  stays green within the 177.

**TDD evidence**: tests read as the specification, not reverse-engineered from the implementation —
they assert on observable behaviour (statuses, output contents, counts, banner), include failure and
edge cases (in-block failure does not bump count, truncated marker, run-cancelled->idle, reconnect
leaves terminal blocks alone), and the capstones walk assembled end-to-end sequences. No
overmocking: the reducer tests use zero mocks (pure fold over scripted real events); the hook tests
use a thin fake transport that only stands in for the socket/fetch boundary, which is correct.

## FOLLOW-UP

None. The diff exposes no untested changed paths, no ADR drift, no dead code, and no adjacent debt
made worse. The L1/L2 follow-ups from the prior step-2 review were correctly folded into this card's
scope as first-class capstone tests rather than deferred. No tech debt created.

## Outstanding close-out actions (review/dispatch-owned, not blockers)

- Code Review Approved checkbox -> set on this approval.
- The card correctly leaves PR-merge, deploy/monitoring/stakeholder/ticket-close, and the
  "all tests incl. e2e/performance" checklist boxes for the dispatch/PR phase.
