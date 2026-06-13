# Executor directive — LUI1WEDGE / 87ifqe (executor-1)

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
- **Completion tag is unchanged**: `LUI1WEDGE-87ifqe-done` (the tag name is independent of the branch).
  Write it per the SKILL recipe: `git -C "$PARENT" tag LUI1WEDGE-87ifqe-done "$(git -C "$WT" rev-parse HEAD)"`.

Everything else in your SKILL applies normally (worktree isolation, `$WT` for code commits, commit
code only / never stage `.gitban/`, TDD, run the project's own targets in the worktree).

## Work scope

`read_card(87ifqe)` for the full acceptance criteria. This is the **step-2 server-package scaffold**
for `@deepnote/runtime-server`. The grounding design doc is `docs/designs/m3-s1-server-api-and-serve.md`
(and ADR-007 server/SPA package layout) — follow it for the package layout, entrypoint, and dependency
wiring. Honour the card's checkboxes and acceptance criteria exactly; tick boxes only for work that is
durably committed on your worktree branch.

---

## Router directive — review 1: APPROVED → close out

Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 87ifqe has been **approved** as of commit `20970b6`
(review file `.gitban/agents/reviewer/inbox/LUI1WEDGE-87ifqe-reviewer-1.md`, verdict APPROVAL —
both gates PASS, capstone reproduced end-to-end including a non-vacuity check). Please use the
gitban tools to update the gitban card and begin the tasks required to properly complete it.

### Card Close-out tasks
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed
  work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- **Close-out items: none blocking.** Per the reviewer:
  - The terminal-stage Completion-Checklist / TDD / Feature-Work-Phases boxes that are genuinely
    n/a for a **non-published scaffold** (production deploy, monitoring/alerting, staging,
    performance testing, integration tests) are correctly out of this card's scope — they belong
    to the closeout/PR pipeline, not this card. Do not fabricate deployment work to tick them. If
    the gitban completion validator requires them resolved, mark them n/a per the card's existing
    convention rather than claiming false work.
  - The two non-blocking follow-ups (L1 slice-integrity-grep-precision, L2 declared-unused-dep) are
    being routed to the **planner** — do **NOT** fix them on this card. They are owned by other
    cards (the canonical slice-integrity CI-script card, and step-4a `hlai4c` execute-stream-ws,
    respectively). The reviewer explicitly said "no action needed on this card" for both.
- This card **IS in a sprint** (LUI1WEDGE), so do **NOT** push a feature branch or open a PR — the
  dispatcher owns sprint lifecycle.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close,
archive, or finalize the sprint itself.
