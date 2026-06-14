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

## Batch 1: step 2 — 6iba9v (ExecutionClient) — DONE

- Executor → reviewer → router: APPROVED. Code at `b146370` (apps/studio/src/execution/ExecutionClient.ts + 15 tests).
- HTTP-trigger (fetch POST → 202 {runId}), WS subscribe-only, `RunTriggerError` typed, capped exponential backoff reconnect.
- Planner folded two capstones into 9xfks2 (step 3): **Correlation** (single-runId binding) + **Reconnect-strand** (missed terminal → idle).
- Reconciled `79ff84d`; b1 closeout `881a70f`.

## Batch 2: step 3 — 9xfks2 (runStore reducer + useExecution hook)

- 9xfks2 → in_progress `58bb85d`.
- **Push-gate triage (3 root causes, all fixed):**
  1. `cspell.json` had a biome format drift (from proactive vocab edits) → `biome check --write cspell.json`, committed `ed8718e`.
  2. `pnpm -r exec tsc --noEmit` SIGKILL'd (OOM) under parallel recursive typecheck on the constrained box — different package each run (reactivity, runtime-core), confirming memory pressure not a type error. Root + reactivity verified clean standalone.
  3. Fix: export `npm_config_workspace_concurrency=1` on the push so the husky hook's recursive typecheck runs **serially**. **Standing rule for every LUIRUN1 push.**
- Push GREEN: `a7e30c4..ed8718e` (cspell 0 issues, serial typecheck, full suite).
- Dispatching 9xfks2 executor (worktree forks from milestone HEAD; BRANCH OVERRIDE — no sprint/LUIRUN1).
