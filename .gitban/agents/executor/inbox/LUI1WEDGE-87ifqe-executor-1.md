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
