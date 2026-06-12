# LUI1WEDGE Dispatch Log

> Sprint **LUI1WEDGE** — roadmap **m3/s1** ("Headless runtime server + one-command launch", the upstream-contributable backend wedge). Showcase: Issue muunkky/deepnote#6, narrative Discussion #5.

## ⚠️ CRITICAL BRANCH OVERRIDE (read before resuming)

This sprint runs **ON `milestone/m3-local-ui`** — the m3 milestone monolith branch — **NOT** the
dispatcher's default `sprint/LUI1WEDGE`. Wherever the dispatcher SKILL says `sprint/{SPRINTTAG}`,
substitute **`milestone/m3-local-ui`**. Do **NOT** create or switch to a `sprint/LUI1WEDGE` branch.
Executor worktrees fork from `milestone/m3-local-ui`'s HEAD and merge back to it; the pre-dispatch
push pushes `origin milestone/m3-local-ui`. (A fresh dispatcher that ignores this will silently fork
the sprint onto `sprint/LUI1WEDGE` and fragment the monolith.)

## ⚠️ Planning card `wzrodp` — do NOT complete at startup

`wzrodp` (step 1, planning) carries the architect's **full 30-item sprint-lifecycle checklist**
(including end-of-sprint items: archive, CHANGELOG, milestone-complete, retrospective). It therefore
**auto-blocks** if `complete_card(wzrodp)` is called now (30/30 checkboxes open — already tripped once
and reversed via `unblock_card`). **Leave `wzrodp` in `todo`. Complete it at CLOSEOUT alongside
`od8esg`**, once the lifecycle items are actually satisfiable. Do NOT call `complete_card(wzrodp)` in
Phase 0/1.

## Resume state (as of pre-dispatch)

- **Phase 0 readiness: COMPLETE.** Orphan sweep clean; `take_sprint` no-op (all cards already `todo`);
  `health_check` healthy, **no pending migrations**; `WorktreeCreate` hook present + executable;
  closeout card `od8esg` verified present.
- **Pre-dispatch push: LANDED.** `origin/milestone/m3-local-ui` == local HEAD `09a892f` (0 ahead / 0 behind).
- **Nothing dispatched yet.** All 12 cards `todo`; no `worktree-agent-*` branches; no `LUI1WEDGE-*-done`
  tags; no executor/reviewer/router/planner inbox artifacts; no ERROR files.
- **➡️ RESUME AT: batch 1, step 2 — executor for `87ifqe` (server-package-scaffold).** (Step 1 = the
  planning card `wzrodp`, handled at closeout per above.)

## Execution sequence (sprint-reviewer-APPROVED)

| Batch | Card(s) | Step | Notes |
|------|---------|------|-------|
| (closeout) | `wzrodp` | 1 | planning — completes at closeout with `od8esg` |
| b1 | `87ifqe` | 2 | server-package-scaffold `@deepnote/runtime-server` |
| b2 | `x71bcm` | 3 | project open/list API — `GET /api/project` (exports `ApiProject`) |
| b3 | `hlai4c` ‖ `e6e3lt` | 4A ‖ 4B | **P0** run-serialization queue (WS execute/stream) ‖ **P0** save API (semantic round-trip + idempotence) |
| b4 | `wd2nil` | 5 | server integration tests — parity with `deepnote run` (**phase barrier**) |
| b5 | `zq7q0g` | 6 | `deepnote serve` command |
| b6 | `sqm7ox` ‖ `yzd78n` | 7A ‖ 7B | `deepnote ui` launch alias ‖ SQL-block parity |
| b7 | `dx99dj` | 8 | contrib-diff cut (clean slice off `upstream/main`) |
| b8 | `k65hcx` | 9 | fork-showcase post (Cameron approves any public post) |
| (closeout) | `od8esg` | 10 | sprint closeout (+ complete `wzrodp`) |

## Settled deferrals (NOT in this sprint → m3/s5; not debt)

- Cancel-a-running-block (P6) — rests on a non-existent `kernel.interrupt()`.
- Reactive `runScope: 'with-upstream'` run scope.
- Run-all coalescing.

## How to resume after a `/clear`

Re-invoke the **gitban-dispatcher** skill for sprint **LUI1WEDGE**, re-supplying the branch override
above. Phase 0 re-runs (idempotent); recovery reads this log + the board (all 12 `todo`) and resumes at
batch 1 (`87ifqe`). Keep `.gitban` board commits separate from code commits (the contrib diff slices clean).

---

## Dispatch history

### Resume (fresh session after /clear)

- Phase 0 re-verified idempotent: orphan sweep clean; working tree clean; `WorktreeCreate` hook ok;
  `health_check` healthy, `pending_migrations: []`; closeout card `od8esg` present; all 12 cards `todo`.
- **Push-hook OOM resolved (standing pattern).** The pre-push hook runs `pnpm lintAndFormat && pnpm
  typecheck && pnpm test && pnpm spell-check`; `typecheck`'s `pnpm -r exec tsc --noEmit` fans out
  concurrent `tsc` and SIGKILL-OOMs on this 6.3Gi/no-swap box (verified: `packages/convert` typechecks
  clean in isolation). Fixed cleanly — **prefix every dispatcher push with
  `npm_config_workspace_concurrency=1`** to serialize the recursive exec. No `--no-verify`; full CI
  still runs (2365 tests green). Reuse for all pushes this sprint.
- Branch override conveyed to executors via the inbox directive (their first-read channel): substitute
  `milestone/m3-local-ui` for `sprint/LUI1WEDGE` in the worktree branch-base check, else they abort on
  the non-existent ref.

### Batch 1 — `87ifqe` (step 2, server-package-scaffold)

- Executor (executor-1, worktree `agent-aaab985ee2536fba4`) completed: 2 code commits, base check passed
  on the override. Fast-forward merge `a654fdc..20970b6` into `milestone/m3-local-ui` (12 files, +621).
  Worktree/branch/`-done` tag cleaned up. Card left `in_progress` for reviewer.
- Reviewer relays from executor: (1) `madge`/`dependency-cruiser` not installed → implemented the
  ADR-007 §6 no-runtime-import invariant via the TS compiler API (AST + transpile-erasure) in the
  always-on `pnpm test` — intentional, stronger than madge, not debt. (2) The literal AC grep
  `git grep -iE 'react|vite|apps/'` false-positives on `@deepnote/reactivity`/`vitest` (zero real
  frontend coupling); recommend the P7 slice-integrity card tighten it to import-form/word-boundary.
- Reviewer **APPROVAL** (both gates; capstone reproduced incl. non-vacuity TS2322 check). Router →
  close-out + planner. Planner: **L1** (grep precision) folded into `dx99dj` acceptance criteria
  (the in-sprint owner of the slice-integrity CI grep — no separate card exists); **L2** (`ws`
  declared-unused) duplicate-dropped (sibling `hlai4c` step-4A requires importing/using `ws`).
  No sprint extension, no closeout-append, no new/blocked/deferred cards.
- Close-out: all 37 checkboxes resolved (6 completed, 13 honest `n/a` w/ inline reasons — no
  fabricated deploy/test work, no false deferrals). `87ifqe` → **done** (board commit `bccd976`).
  Post-merge validation green: 7/7 tests, build, `/types` capstone, `pnpm install --frozen-lockfile`.
- Cleaned a stray `packages/convert/.gitban/` (hook-audit artifact from an agent's bad-CWD hook
  invocation — untracked noise, not board state).
- **b1 DONE → 1/12. Next: b2 `x71bcm` (step 3, GET /api/project).**

### Batch 2 — `x71bcm` (step 3, GET /api/project)

**Push-blocker saga (resolved; durable fixes recorded):** card-87ifqe's code passed the executor's
tests/typecheck/build but had **never been run through the project's biome / prettier / cspell gates**
(nor by the reviewer), so the dispatcher pre-push (`pnpm lintAndFormat && typecheck && test &&
spell-check`) kept failing. Fixed at the merge gate, one commit each: biome autofix (import order,
formatting) + `type`→`interface`; `void`-marked `server.test.ts` `resolve()` calls (biome's
type-unaware *per-file* pre-commit pass false-positives `noFloatingPromises`; project-wide `biome
check .` already passes — `void` satisfies both without an unused-suppression); British
`behavioural`/`behaviourally` → `docs-dictionary.txt`; prettier-format the README.
- **DURABLE — flaky vitest timeout.** On this 6.3Gi/no-swap box the default vitest worker fan-out
  thrashes (multi-minute transform/import) and the Python-subprocess tests (`reactivity` DAG, `cli`
  stats) miss the 5s default timeout; `bail:1` then fails the whole push. Fix: `vitest.config.ts`
  now reads `VITEST_MAX_WORKERS`/`VITEST_MIN_WORKERS`/`VITEST_TEST_TIMEOUT` (opt-in; unset = vitest
  defaults, so CI/maintainers unaffected; fork-only — exclude from contrib slice). **Standing push
  command for this sprint:** `npm_config_workspace_concurrency=1 VITEST_MAX_WORKERS=2
  VITEST_MIN_WORKERS=1 VITEST_TEST_TIMEOUT=30000 git -C "$PARENT" push origin milestone/m3-local-ui`.
- **Process fix:** amended the executor directive to require running `pnpm exec biome check --write`
  + `pnpm spell-check` before finishing. **It worked** — the x71bcm executor ran the gates itself
  (auto-fixed an import-order issue, added `unfakeable` to the dict).
- Pre-push landed `a654fdc..aee1530` (full CI green, 2372 tests under 2-worker run).
- Executor (executor-1, worktree `agent-a4a53574491e3cf59`) completed: 1 commit `e88fd33`, base check
  passed on the override. Fast-forward merge `aee1530..e88fd33` (10 files, +584). Built `GET
  /api/project`: `Session` (KD-6 `loadProject`/`startEngine` split, hex SHA-256 `openHash`,
  kernel-free open), framework-free `node:http` router, fixture, 22/22 tests incl. the no-kernel
  deep-equal capstone over real HTTP. Card left `in_progress` for reviewer.
- Reviewer flags from executor: (1) `capabilities.reactivity` always `'disabled'` in s1 (reactive
  exec is m3/s5 — emitting `'python'` would advertise a non-existent capability; matches the
  api-types contract sample). (2) Root `tsconfig.json` now excludes `**/*.capstone.ts` from the
  general typecheck glob — minimal fix for a pre-existing scaffold `TS2307` (capstones typecheck via
  the dedicated `check:types-subpath`). Reviewer to scrutinize the shared-config change.
