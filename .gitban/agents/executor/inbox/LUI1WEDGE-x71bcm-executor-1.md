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
