# Dispatch log — sprint EXTIDCI1

**Sprint goal:** ship the complete #325 fix — case-insensitive SQL integration ID matching (built-in + external) plus a non-string metadata guard — as one coherent, harness-vetted change.
**Roadmap node:** m1/s4 → database-integrations-package → case-insensitive-id-filtering
**Handle:** CAMERON · **Working branch:** `sprint/EXTIDCI1`

## Cards

| Card   | Type  | Step         | Final status    |
| :----- | :---- | :----------- | :-------------- |
| jlb11a | bug   | 1            | done → archived |
| ebh818 | chore | N (closeout) | done → archived |

## Phase 0 — readiness

- Migration preflight (`health_check`): `pending: []` → PROCEED.
- Closeout card verified present: `ebh818`.
- `WorktreeCreate` hook active (forks worktrees from sprint HEAD, not `main`).
- Sprint branch created and pushed to `origin/sprint/EXTIDCI1`.

## Phase 1 — batch 1 (`jlb11a`)

| Step      | Agent                        | Result                                                                                                    |
| :-------- | :--------------------------- | :-------------------------------------------------------------------------------------------------------- |
| Executor  | `gitban-executor` (worktree) | commit `3684ca4`, `packages/cli/` only, 31/31 tests, typecheck + Biome clean. Tag `EXTIDCI1-jlb11a-done`. |
| Merge     | dispatcher                   | fast-forward into `sprint/EXTIDCI1`; worktree pruned; card-state reconciled.                              |
| Reviewer  | `gitban-reviewer`            | **APPROVAL** — Gate 1 PASS, Gate 2 PASS; re-ran the 3 suites 31/31. No blockers, no follow-ups.           |
| Router    | `gitban-router`              | **APPROVAL** (cycle 1). No rework, no planner work.                                                       |
| Close-out | `general-purpose`            | card `jlb11a` → done (checkboxes resolved honestly; Manual Test annotated not-run-in-worktree).           |

**No planner dispatched** — the reviewer and router surfaced zero follow-up/tech-debt items, so there was nothing for a planner to classify. (A planner runs only when work needs routing to backlog/sprint/closeout.)

## Phase 5 — close-out

- Roadmap `m1/s4/.../case-insensitive-id-filtering` → done (ref PR #401, card jlb11a).
- `jlb11a` and `ebh818` archived; sprint summaries generated.
- CHANGELOG: N/A (repo has no CHANGELOG / changeset convention).
- **Gate 0:** EXTERNAL_PROBE_ERROR on strict run (no external probe wired in this gitban build) → dispatcher manually confirmed external state (0 in-progress, roadmap flipped, fork branch has no CI gate, fix verified locally 31/31 + clean PR #401) → re-ran cite-only → **PASS** (4 cited boxes). See `EXTIDCI1-gate0-202606100012.json`.
- Board committed and pushed to `origin/workspace`.

## Delivery

- **PR #401** — the complete fix, `packages/cli/` only, ready for review (`Closes #325`).
- Superseded the earlier hand-executed partial attempt (closed PR #399).

## Note on this run

This sprint was run to correct an earlier process failure: the #325 work was first hand-executed (executor + reviewer dispatched manually, no dispatcher loop), which let a crash escape internal review to a public reviewer. This run goes through the full `gitban-dispatcher` loop end-to-end so the adversarial reviewer gates the change before it ships.
