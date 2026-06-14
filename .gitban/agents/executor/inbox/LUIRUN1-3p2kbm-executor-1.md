Use `.venv/Scripts/python.exe` to run Python commands (or the project's configured Python env).

The reviewer REJECTED card `3p2kbm` (LUIRUN1 step 4) at commit `3bc105c` with one Gate 2 (code-quality) blocker. The card structure (Gate 1) passed — Intent, capstone, and checkboxes are sound. Do NOT rewrite working code beyond what the blocker requires. Implement the blocker below TDD-first, re-run the studio suite + typecheck + isolation invariant, then re-submit for review.

Full review: `.gitban/agents/reviewer/inbox/LUIRUN1-3p2kbm-reviewer-1.md`

===BEGIN REFACTORING INSTRUCTIONS===

## B1 — Exec-count deliverable plumbed but never rendered (Gate 2 — code-quality)

Both the card ("Initial Design Thoughts": *"show a running spinner + exec count"*) and the design doc Phase 3 Deliverables (*"`CodeRenderer`/`SqlRenderer` consume the optional `run` prop (live-vs-persisted output selection, running spinner, exec count)"*) name the execution count as part of the renderer affordance for THIS card.

The diff threads `executionCount` all the way through — `BlockRun.executionCount` (`blockRun.ts`), `buildRun` in `Shell.tsx` (`executionCount: state.executionCount`), and the store increments it correctly on `block-done` success — but **nothing renders it**. `RunControl` renders only the status pill (`STATUS_LABEL[status]`) + the busy spinner; `CodeRenderer`/`SqlRenderer` render the control and outputs but no count. `grep` confirms zero render sites. The `BlockRun.executionCount` doc comment even reads *"reserved for the exec-count affordance"* — an explicit acknowledgement that the named affordance was not built.

The running spinner (the other half of the same deliverable sentence) was built and tested. This is shipping part of a named deliverable and silently deferring the rest — a Gate 2 blocker, not a follow-up.

**Refactor plan (small, TDD-first):**

1. **Write the failing test first.** A `RunControl` (and/or `CodeRenderer.run`) test asserting the exec count renders after a successful run and is ABSENT at `executionCount === 0`. Mirror the existing `RunControl.test.tsx` / `CodeRenderer.run.test.tsx` style and the fake-`useExecution` strategy already in place.
2. **Render the count where the deliverable scopes it** — the natural home is the `RunControl` status pill. Render a `[N]` exec-count badge once `executionCount > 0`, mirroring Jupyter's `In [N]`. Drive it from a new `executionCount` prop on `RunControl` (the value is already in `BlockRun` and already passed into `buildRun`, so wire it through `CodeRenderer`/`SqlRenderer` → `RunControl`).
3. Keep it **inert / display-only** — it does not touch the KD-4 read-only allowlist. Verify the `readOnlyInvariant.test.tsx` still passes unchanged (no new mutating control appeared).
4. Remove the now-stale *"reserved for the exec-count affordance"* doc comment on `BlockRun.executionCount`.

**Verification before re-submit:**
- `cd apps/studio && vitest run` — full studio suite green (was 193/193; expect the new count test added and passing).
- `pnpm --filter @deepnote/studio exec tsc --noEmit` — exit 0.
- `test-helpers/apps-studio-isolation.test.ts` — isolation invariant green (0 `apps/` files in root tsc).
- Biome clean on changed files; README updated only if the count behaviour warrants a line in the "Running blocks" section.

===END REFACTORING INSTRUCTIONS===

## After the blocker is fixed
- Do NOT mark the card done or check the reviewer-owned boxes (Code Review Approved, PR merged, deploy/monitoring/stakeholder/ticket) — those stay for the reviewer/PR flow.
- Update the Executor Close-out section on the card (cycle 2) describing the exec-count render + its test, then leave the card for the reviewer to re-review. The dispatcher owns sprint lifecycle — do not close or archive the sprint.
