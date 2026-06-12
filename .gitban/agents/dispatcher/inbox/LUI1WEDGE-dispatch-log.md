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

_(no batches dispatched yet — pre-dispatch)_
