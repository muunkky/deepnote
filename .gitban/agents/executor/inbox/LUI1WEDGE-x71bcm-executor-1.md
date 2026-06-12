# Executor directive — LUI1WEDGE / x71bcm (executor-1)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`** (the m3 milestone monolith branch), **NOT**
`sprint/LUI1WEDGE`. **There is no `sprint/LUI1WEDGE` branch** — do not look for it, fetch it, or
check against it.

Wherever your SKILL says `sprint/<tag>` / `sprint/LUI1WEDGE`, substitute **`milestone/m3-local-ui`**:

- **Worktree branch-base check** (SKILL §"Worktree branch-base check"): run
  ```bash
  git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"
  ```
  Your worktree was forked from `milestone/m3-local-ui`'s HEAD by the `WorktreeCreate` hook, so this
  passes. Checking the default `sprint/LUI1WEDGE` ref would error (ref does not exist) and falsely
  report `WRONG BASE` — do **not** do that.
- **Merge-back target**: the dispatcher merges your `worktree-agent-…` branch back into
  `milestone/m3-local-ui`. You do not merge; just commit code to your worktree branch as usual.
- **Completion tag is unchanged**: `LUI1WEDGE-x71bcm-done` (the tag name is independent of the branch).
  Write it per the SKILL recipe: `git -C "$PARENT" tag LUI1WEDGE-x71bcm-done "$(git -C "$WT" rev-parse HEAD)"`.

Everything else in your SKILL applies normally (worktree isolation, `$WT` for code commits, commit
code only / never stage `.gitban/`, TDD).

## Build context

Step 2 (`87ifqe`) landed the `@deepnote/runtime-server` scaffold (already on `milestone/m3-local-ui`):
`packages/runtime-server/` with `src/api-types.ts` (canonical `ApiProject` contract), `src/server.ts`
(`createServer` stub over `node:http`), and `src/index.ts`. **Build the `GET /api/project` endpoint on
top of that scaffold** — do not re-scaffold.

`read_card(x71bcm)` for the full acceptance criteria. The grounding design doc is
`docs/designs/m3-s1-server-api-and-serve.md` ("Phase 2: Open project + list API" + KD-6) and ADR-007 §6;
the card's Required Reading table lists the exact source files/lines to reuse (the `loadProject()` /
`startEngine()` split, resolution sequence from `run.ts`, capability flags). Honour the card's
checkboxes and the capstone (deep-equal vs `deserializeDeepnoteFile` on a real fixture, **no kernel
started**) exactly; tick boxes only for work durably committed on your worktree branch.

## ⚠️ Before you finish — run the project's lint + spell gates (the b1 push-blocker)

The project's pre-push runs `pnpm lintAndFormat && pnpm typecheck && pnpm test && pnpm spell-check`. In
batch 1 the executor ran tests/typecheck/build but **not** lint or spell-check, which blocked the
dispatcher's push (biome import-order/format + `useConsistentTypeDefinitions`, and cspell on British
`behavioural`). Do **not** repeat this. Before you return, run on your worktree:

```bash
pnpm exec biome check --write packages/runtime-server   # auto-fix import order / formatting / lint
pnpm spell-check                                         # cspell — add new terms to docs-dictionary.txt (not source)
```

Fix anything biome can't auto-fix (e.g. prefer `interface` over `type X = {…}` for object types), and
re-run until both are clean. Commit the fixes on your worktree branch. This is part of "tests pass before
merge" — a lint/spell failure is a completion failure, not a follow-up.

---

## ROUTER CLOSE-OUT DIRECTIVE (reviewer-1: APPROVAL) — appended after review

Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id x71bcm has been **approved** as of commit `e88fd33`
(reviewer report: `.gitban/agents/reviewer/inbox/LUI1WEDGE-x71bcm-reviewer-1.md`). The
implementation work above is done — switch to close-out. Use the gitban tools to update the
card and complete it.

### Card Close-out tasks
- Use gitban's checkbox tools to ensure every checkbox for completed work is checked off.
  - **Specifically check the two reviewer-gate boxes** that were intentionally left unchecked:
    "API contract is reviewed and approved by team/stakeholders" — it appears twice (the
    "API Development Phases" table row, and the "Completion Checklist"). The reviewer has now
    approved, so both are satisfied — check them both.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- **Close-out items: none.** The reviewer flagged two non-blocking follow-ups (L1
  capability-coupling-gap, L2 test-depth-gap). These are being routed to the **planner** — they
  are NOT yours to implement. Do not touch `session.ts` capability logic or add the engine-spy
  test here.
- **CHANGELOG**: owned by the sprint closeout card (`od8esg`) per this card's own declaration —
  do not edit it here.
- This card is in sprint **LUI1WEDGE**, so do **not** push a feature branch or open a PR. The
  dispatcher owns sprint lifecycle.

You are closing out this card only. Do not close, archive, or finalize the sprint itself —
that is the dispatcher's job.
