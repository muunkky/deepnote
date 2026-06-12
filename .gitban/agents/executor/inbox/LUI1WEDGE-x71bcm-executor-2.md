# Executor directive — LUI1WEDGE / x71bcm (executor-2, L1 reopen)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`. There is no
`sprint/LUI1WEDGE` branch — do not look for it, fetch it, or check against it.

Wherever your SKILL says `sprint/<tag>` / `sprint/LUI1WEDGE`, substitute **`milestone/m3-local-ui`**:

- **Worktree branch-base check:** run
  ```bash
  git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"
  ```
  Your worktree was forked from `milestone/m3-local-ui`'s HEAD by the `WorktreeCreate` hook, so this
  passes. Checking the default `sprint/LUI1WEDGE` ref would error and falsely report `WRONG BASE`.
- **Merge-back target**: the dispatcher merges your `worktree-agent-…` branch back into
  `milestone/m3-local-ui`. You do not merge; just commit code to your worktree branch.
- **Completion tag**: `LUI1WEDGE-x71bcm-done` — write it per the SKILL recipe.

Commit **code only / never stage `.gitban/`**; TDD.

## This is a REOPEN — scope is L1 only

`x71bcm` was approved at `e88fd33` then reopened for one correctness fix. **Read the card's
`## Reopen — Reviewer cycle 1, L1 (capability-coupling-gap)` section** — it is the authoritative
spec. Do NOT re-do the already-approved work; the endpoint, session, router, fixture, README and
all existing tests are committed and good. Touch **only** `packages/runtime-server/src/session.ts`
and `packages/runtime-server/src/session.test.ts`.

The bug: in `resolveCapabilities`, the Python interpreter is probed *unconditionally*, so a
mis-installed Python interpreter wrongly nulls `kernelLanguage` even for an explicit **non-Python**
kernel (e.g. `--kernel bash`). The existing bash test masks this by passing a resolvable
`python: 'python3'`.

Honour the three fix checkboxes in the Reopen section (TDD — write the failing non-Python +
unresolvable-Python regression test first, then gate the probe on `!nonPython`, then confirm all
existing capability tests + the full package suite stay green). Tick those boxes only for work
durably committed on your worktree branch.

**OUT OF SCOPE — do not touch:** L2 (the engine-construction-spy regression) is NOT part of this
reopen; it waits on step 4A and lives on the closeout card `od8esg`. Do not add it here, and do not
re-open the capstone, router, or fixture work.

## ⚠️ Before you finish — run the project's lint + spell gates

The pre-push runs `pnpm lintAndFormat && pnpm typecheck && pnpm test && pnpm spell-check`. Before
you return, run on your worktree and fix until clean:

```bash
pnpm exec biome check --write packages/runtime-server
pnpm spell-check
```

A lint/spell failure is a completion failure, not a follow-up. The package vitest suite is best run
with `VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000` on this constrained box (the default 5s
timeout misses the cold-module-graph python-subprocess probe; not a logic issue).

This card is in sprint **LUI1WEDGE** — do not push a feature branch or open a PR; the dispatcher
owns sprint lifecycle.
