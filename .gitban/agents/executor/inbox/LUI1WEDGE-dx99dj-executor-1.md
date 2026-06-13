# Executor directive — LUI1WEDGE / dx99dj (executor-1, step 8: contrib-diff cut + slice-integrity CI grep)

## ⚠️ BRANCH OVERRIDE
This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE`. Wherever the card's recipe says
`git checkout sprint/LUI1WEDGE -- <paths>`, substitute **`milestone/m3-local-ui`**.
- Your isolated worktree forks from `milestone/m3-local-ui`. Base check:
  `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`.
- Merge-back target `milestone/m3-local-ui`; completion tag `LUI1WEDGE-dx99dj-done`. Commit **code only**.

This card has **two deliverables** — read both. `read_card(dx99dj)` for the full DoD + the L1
slice-integrity-grep-precision section (load-bearing).

## Deliverable A (mergeable to milestone) — the tightened slice-integrity CI grep gate

Implement the slice-integrity / boundary gate as an **always-on `pnpm test` test** (the reviewable,
mergeable core — this card "owns the slice-integrity CI grep"). Per the card's **L1 precision** AC, the
gate must use **import-form / word-boundary matching**, NOT the bare `-iE 'react|vite|apps/'` substring
regex, because that false-positives on the legitimate `@deepnote/reactivity` dep and the `vitest` runner.

- Add a test (e.g. `packages/runtime-server/src/slice-integrity.test.ts`, mirror the `87ifqe`
  `api-types-no-runtime-import.test.ts` style) that scans the serve-slice paths (`packages/runtime-server/**`
  + `packages/cli/src/commands/serve.ts` + `packages/cli/src/cli.ts` + `packages/cli/package.json`) and FAILS
  on a real framework import or an `apps/` import edge, matching forms like `from ['"](react|react-dom|vite)['"]`,
  `\breact\b`/`\bvite\b`, `@vitejs`, `from ['"]\.\.?/.*apps/` — while NOT matching `reactivity`/`vitest`.
- Include the **regression assertion** the card mandates: prove the tightened gate returns nothing on the
  real slice even though the slice legitimately contains `reactivity` and/or `vitest`, AND that it DOES
  catch a planted `import 'react'` / `from '../apps/...'` line (non-vacuity).
- Also assert the boundary: no `packages/ → apps/` import edge in the slice; `api-types.ts` runtime-import-free
  (reuse/extend the existing no-runtime-import test if cleaner).

This is normal code work — commit it to your worktree branch; the dispatcher merges it to milestone.

## Deliverable B (fork artifact) — cut + verify + push `contrib/m3-serve`

Produce the clean upstream-ready slice as a separate branch off `upstream/main` (code-only: NO
`.gitban`/`.claude`/`docs`/`apps`). **Do this WITHOUT disturbing the parent repo's `milestone/m3-local-ui`
checkout** — use a dedicated worktree OUTSIDE `.claude/worktrees/` (so the dispatcher's worktree sweeps
never touch it). `upstream/main` is already fetched locally. Recipe (run with `PARENT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"`):

```bash
git -C "$PARENT" fetch upstream
CONTRIB_WT="$PARENT/../deepnote-contrib-m3-serve"
git -C "$PARENT" worktree add -b contrib/m3-serve "$CONTRIB_WT" upstream/main
# slice ONLY the code paths from the milestone branch into the contrib worktree:
git -C "$CONTRIB_WT" checkout milestone/m3-local-ui -- packages/runtime-server packages/cli/src/commands/serve.ts packages/cli/src/cli.ts packages/cli/package.json
#   (+ any other genuine serve-delta code paths you identify by diffing milestone vs upstream/main —
#    e.g. the runtime-core integration-helper lift if the slice needs it to build; include the MINIMAL
#    closure that builds standalone. NEVER include .gitban/.claude/docs/apps or the SPA.)
git -C "$CONTRIB_WT" add -A && git -C "$CONTRIB_WT" commit -m "feat(runtime-server): local serve API + deepnote serve/ui (m3/s1 wedge slice)"
```

Then **verify the slice builds standalone in `$CONTRIB_WT`**: `pnpm install --frozen-lockfile && pnpm build
&& pnpm typecheck && pnpm test` all green with **NO `apps/` directory present**, and the tightened
slice-integrity grep returns nothing over the slice. If the minimal closure doesn't build (a missing
dependency path), expand the sliced paths to the minimal set that builds — but never add SPA/board/docs.
**Push** the verified branch: `git -C "$CONTRIB_WT" push -u origin contrib/m3-serve`. Then remove the temp
worktree: `git -C "$PARENT" worktree remove --force "$CONTRIB_WT"`.

**If the standalone build genuinely cannot be made green** (e.g. an unavoidable cross-package dep that
can't ride the slice without pulling the SPA), STOP and document precisely in your close-out what blocks a
clean slice — do NOT force it or pull in forbidden paths. That is a real finding, not a failure to hide.

## Gates before returning (for deliverable A, on your worktree)
`pnpm test` (mocked, green incl. your new slice-integrity test), `pnpm typecheck` (both halves),
`pnpm exec biome check --write`, `pnpm spell-check` (from parent; add terms to `docs-dictionary.txt`).
Be honest in close-out about deliverable B's outcome (branch pushed + standalone-green, or the blocker).
Do not open a PR — the dispatcher owns PR lifecycle.
