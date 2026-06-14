---
verdict: APPROVAL
card_id: 3p2kbm
review_number: 2
commit: 2670991
date: 2026-06-13
has_backlog_items: false
---

# Review 2 — LUIRUN1 / 3p2kbm — step 4: Run/Run-all affordances + live output rendering

## Summary

APPROVAL. This cycle is a focused rework of review-1's single Gate 2 blocker (B1: the
exec-count deliverable plumbed but never rendered). The fix lands exactly as the review-1
refactor plan scoped it, TDD-first, with no collateral change to the approved-grade surface.

Gate 1 was passed in review 1 (DoD/Intent/capstone/checkboxes sound) and the card structure is
unchanged this cycle, so this review is Gate 2 on the B1 diff plus a regression check that the
rest of step 4 is intact.

## B1 — RESOLVED (was Gate 2 code-quality)

The exec-count affordance — a named Phase-3 renderer deliverable in both the card and the design
doc — was previously threaded through `BlockRun.executionCount` → `buildRun` → the store
(increment on `block-done` success) but had no render site. This cycle renders it:

- `RunControl` gains a required `executionCount: number` prop and renders a display-only `[N]`
  badge in the status pill once `executionCount > 0` (`data-run-count`, `title` with correct
  singular/plural, mirroring Jupyter's `In [N]`); omitted at 0 so a never-succeeded block reads
  exactly as s2.
- `CodeRenderer` / `SqlRenderer` wire `run.executionCount` through to `RunControl` — no new
  upstream plumbing, since the value was already in `BlockRun` and already passed into `buildRun`.
- The stale `"reserved for the exec-count affordance"` doc comment on `BlockRun.executionCount`
  is replaced with one naming the render site.

I verified the value the badge renders is live, not a dead constant: `runStore.ts:140` increments
`executionCount` on `block-done` success, `Shell.tsx:98` passes `state.executionCount` into
`buildRun`, and the badge consumes `run.executionCount`. The full chain store → buildRun →
BlockRun → RunControl is real and end-to-end.

The badge is purely display-only — no event handlers, no editable control — so it introduces no
new KD-4 read-only crossing. `readOnlyInvariant.test.tsx` passes unchanged (3/3), confirming no
new mutating control appeared.

## TDD

The tests were written to the contract, not reverse-engineered from internals:

- `RunControl.test.tsx`: a new test asserts the badge is ABSENT at `executionCount === 0` and
  PRESENT at `executionCount === 3` (`data-run-count="3"` and text contains `3`) — both the
  positive and the negative case. The pre-existing RunControl tests were mechanically updated to
  pass the now-required prop; runtime behaviour unchanged.
- `CodeRenderer.run.test.tsx`: a new test asserts the renderer surfaces the count from the `run`
  prop once a block has succeeded. Asserts on observable DOM (`data-run-count` attribute), not
  internal state.

## Verification (re-run in the executor worktree at 2670991)

- **Studio suite: 195/195 pass** (was 193/193; +2 new exec-count tests) — `apps/studio` vitest run.
- **Typecheck clean** — `tsc --noEmit` exit 0.
- **readOnlyInvariant (KD-4): 3/3 pass** unchanged — no new mutating control.
- **Biome clean** on all 6 changed TS/TSX files.

## Follow-up

No new follow-ups this cycle. The review-1 follow-ups (L1 SqlRenderer run-prop test gap,
L2 renderer run/output DRY-duplication, L3 misleading `withKernel` no-op) were already routed to
the planner and are unaffected by this diff. L2's duplication is still present (this cycle did not
touch the selection block) but is already tracked — not re-surfacing.

## Outstanding close-out actions (on approval)

- Reviewer-owned boxes (Code Review Approved, PR merged, deploy/monitoring/stakeholder/ticket)
  remain for the PR flow — correctly left unchecked by the executor.
