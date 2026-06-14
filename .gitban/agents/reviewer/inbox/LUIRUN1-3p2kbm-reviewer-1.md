---
verdict: REJECTION
card_id: 3p2kbm
review_number: 1
commit: 3bc105c
date: 2026-06-13
has_backlog_items: true
---

# Review — LUIRUN1 / 3p2kbm — step 4: Run/Run-all affordances + live output rendering

## Summary

Strong card and a clean, well-architected diff. Gate 1 passes: the DoD has a real plain-English Intent and an unfakeable capstone (the assembled `BlockRenderer` + real `useExecution` + real `OutputRenderer` run→render→replace loop), and the checkboxes prove correctness rather than restate the title. Gate 2 is almost an approval — the live loop, KD-3 replace-on-start, KD-4 read-only allowlist, KD-6 capability gate, and R2 single-renderer reuse are all implemented faithfully and verified.

I verified the close-out claims directly in the executor's worktree (`3bc105c`): **193/193 studio tests pass**, `tsc --noEmit` exits 0, and the `apps-studio-isolation` invariant is green (root `tsc --listFilesOnly` names 0 `apps/` files). All dependency shapes (`BlockRunStatus`, `useExecution`, `ExecutionClient`, `OutputRenderer`'s `.output-renderer` class, `OutputRenderer` returning `null` on empty `outputs[]`) match the way the diff consumes them.

There is one Gate 2 blocker: a named Phase-3 deliverable — the **execution count** affordance — was plumbed into the descriptor but never rendered, and silently dropped rather than tracked.

## BLOCKERS

### B1 — Exec-count deliverable plumbed but never rendered (Gate 2 — code-quality)

Both the card ("Initial Design Thoughts": *"show a running spinner + exec count"*) and the design doc Phase 3 **Deliverables** (*"`CodeRenderer`/`SqlRenderer` consume the optional `run` prop (live-vs-persisted output selection, running spinner, exec count)"*) name the execution count as part of the renderer affordance for this card.

The diff threads `executionCount` all the way through — `BlockRun.executionCount` (`blockRun.ts`), `buildRun` in `Shell.tsx` (`executionCount: state.executionCount`), and the store increments it correctly on `block-done` success — but **nothing renders it**. `RunControl` renders only the status pill (`STATUS_LABEL[status]`) + the busy spinner; `CodeRenderer`/`SqlRenderer` render the control and outputs but no count. `grep` confirms zero render sites. The `BlockRun.executionCount` doc comment even reads *"reserved for the exec-count affordance"* — an explicit acknowledgement that the named affordance was not built.

The running spinner (the other half of the same deliverable sentence) *was* built and tested. So this is shipping part of a named deliverable and deferring the rest, with no follow-up card and no `No capstone applicable`-style declaration covering the gap. Per the reviewer standard, in-scope work labelled (or silently left) as future work is a Gate 2 blocker, not a follow-up.

**Refactor plan (small):** render the count where the deliverable scopes it — the natural home is the `RunControl` status pill (e.g. a `[N]` exec-count badge once `executionCount > 0`, mirroring Jupyter's `In [N]`), driven by a new `executionCount` prop on `RunControl` (the value is already in `BlockRun` and already passed into `buildRun`). Write the failing test first (TDD): a `RunControl`/`CodeRenderer` test asserting the count renders after a successful run and is absent at `executionCount === 0`. Keep it inert — it is display-only, so it does not touch the KD-4 allowlist.

*Alternatively*, if the count is genuinely meant to slip to a later step, that is a card-scope decision the planner must make explicitly: cut it from this card's deliverable wording and open a tracked follow-up card. Dropping it silently is the failure mode. I am treating it as in-scope because both the card and the design list it as a Phase-3 renderer deliverable.

## FOLLOW-UP

- **L1 (`test-coverage-gap`):** `SqlRenderer`'s `run`-prop branch (Run control + live-vs-persisted selection) has no direct unit test. `CodeRenderer.run.test.tsx` covers the code path thoroughly; `SqlRenderer.test.tsx` only exercises the s2 (no-`run`) posture. The assembled `readOnlyInvariant`/`Shell.run` tests render the sql block `a6` with a `run` descriptor, so the control *appearing* on sql is indirectly covered — but the live-replaces-persisted selection for sql specifically is not asserted. Failure mode: a future edit to `SqlRenderer`'s `hasSessionRun` branch (or a copy-paste divergence from `CodeRenderer`) would not be caught. Add a sql analogue of the CodeRenderer live/persisted/replace tests.

- **L2 (`dry-duplication`):** the live-vs-persisted selection block and the `run`-toolbar JSX are now duplicated verbatim across `CodeRenderer.tsx` and `SqlRenderer.tsx` (`const persisted = ...; const outputs = run !== undefined && hasSessionRun(run) ? run.outputs : persisted;` + the `{run !== undefined ? <toolbar><RunControl/></toolbar> : null}` wrapper). The pattern now appears twice and the executable-renderer set may grow. Failure mode: a fix to the selection logic (e.g. a future KD-3 refinement) applied to one renderer and missed in the other. Consider extracting a small `useBlockOutputs(block, run)` helper or a shared `<RunToolbar run={run}/>` once a third runnable renderer would appear.

- **L3 (`test-clarity`):** `Shell.run.test.tsx` defines `withKernel(project) => project`, an identity no-op whose name implies it mutates capabilities. It is harmless but misleading (the kernel state is actually driven by the separate `kernelLanguage` prop). Inline it or drop it.

## Outstanding close-out actions (on approval)

- Reviewer-owned boxes (Code Review Approved, PR merged, deploy/monitoring/stakeholder/ticket) remain for the PR flow — correctly left unchecked by the executor.
