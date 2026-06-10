# Contributing to deepnote (fork workflow)

> Personal dev-setup instructions for this clone. Lives on the `workspace`
> branch and is pushed only to the public fork — **never** include this, or any
> `.gitban/` / `.claude/` file, in a PR to `deepnote/deepnote`.

## Why a fork

This account (`muunkky`) has only **READ** access to `deepnote/deepnote`, so
contributions go through a fork — you cannot push branches to upstream.
gitban has no "local-only" mode (its board is meant to live in git), so the
board + scaffold are committed and pushed to the public fork instead.

## Remotes & branches

```
upstream = deepnote/deepnote   (read-only source of truth)
origin   = muunkky/deepnote    (your public fork — full write)

main       → tracks upstream/main; a clean mirror. NEVER commit here directly.
workspace  → gitban board + scaffold (.gitban/, .claude/). Pushed to origin/workspace.
feat/*     → PR branches, cut from upstream/main (clean — no gitban files).
```

Git HTTPS auth is brokered by the GitHub CLI (`gh auth setup-git`, token scope `repo`).

## Day-to-day

**Start a contribution** (clean base → no gitban files in the PR):
```bash
git fetch upstream
git checkout -b feat/my-thing upstream/main
# ...code changes, commit...
git push -u origin feat/my-thing
gh pr create --repo deepnote/deepnote --base main --head muunkky:feat/my-thing
```

**Stay current with upstream:**
```bash
git checkout main && git pull upstream main && git push origin main
```

**Run gitban** on the `workspace` branch, where the board and tooling live.

## The one sharp edge

PR branches are cut from `upstream/main`, so `.gitban/` and `.claude/` are
**not** in the working tree on those branches — that's what keeps them out of
PR diffs. Plan and dispatch on `workspace` (tooling present), then move only
the **code** commits onto a clean branch off `upstream/main` for the PR
(cherry-pick, or `git checkout workspace -- <code paths>`).

Discipline that makes this painless: **never mix `.gitban/` board changes and
code changes in the same commit.** Keep board mutations and code edits in
separate commits so the code delta can be cleanly extracted.
