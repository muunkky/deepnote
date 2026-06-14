# LUIRUN1 Dispatch Log

Sprint: **LUIRUN1** — roadmap **m3/s3** "Run blocks with live streamed output" (live-execution UI, `apps/studio`).
Working branch: **milestone/m3-local-ui** (BRANCH OVERRIDE — fork-only SPA per #162; no `sprint/LUIRUN1`).
Closeout card: **74r41t**. Planning card: **pa82wc**.
Design doc: `docs/designs/m3-s3-live-execution.md` (reviewed). ADR-005 (proxy transport), ADR-006/007 (isolation).

## Card inventory (7)

| Step | Card | Title | Batch |
| :--- | :--- | :--- | :--- |
| 1 | pa82wc | sprint planning | closeout-coupled |
| 2 | 6iba9v | ExecutionClient — HTTP-trigger + WS subscribe | b1 |
| 3 | 9xfks2 | runStore reducer + useExecution hook | b2 |
| 4 | 3p2kbm | Run/Run-all + live output rendering | b3 |
| 5 | e6usnq | failure banners + in-place tracebacks | b4 ‖ |
| 6 | 2udi5b | gated <2s live-loop measurement (real kernel) | b4 ‖ |
| 7 | 74r41t | sprint closeout | b5 |

## Execution plan

Serial spine 2→3→4, then parallel 5 ‖ 6 (both depend on 4, disjoint files — sprint-review finding), then closeout.
KD-2: runs triggered via HTTP `POST …/run` (deterministic runId); WS subscribe-only. Type-only ADR-006/007 boundary. Run = allowlisted read-only crossing.

## Pre-dispatch

- Migration preflight: PASS (no pending; gitban 2.0.0a1 healthy).
- Closeout card 74r41t present. WorktreeCreate hook active (forks from milestone HEAD).
- Branch at 6d3dad5 (clean). Standing push: milestone/m3-local-ui (constrained-box env vars).
- Proactive post-merge cspell before each push (worktree useGitignore quirk; cspell.json self-excluded).

---

## Batch 1: step 2 — 6iba9v (ExecutionClient)
