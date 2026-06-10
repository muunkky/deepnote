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

## Local dev setup

**Baseline — needed for any contribution.** TypeScript monorepo, pnpm workspace.

```bash
nvm use                        # Node 22.21.0 (.nvmrc; engines >=22.14.0)
corepack enable                # pnpm 10.19 — npm/yarn are rejected by packageManager
pnpm install --frozen-lockfile
```

Reproduce CI locally before pushing:

```bash
pnpm test          # vitest
pnpm typecheck     # tsc --noEmit across packages
pnpm lintAndFormat # Biome (TS/JS) + Prettier (md/yaml)
pnpm spell-check   # cspell — add terms to cspell.json / docs-dictionary.txt
```

Docker is listed as a prereq in `CONTRIBUTING.md`.

**Per-area extras** (only when you touch that area):

| Area / packages                                               | Extra setup beyond baseline                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `blocks`, `convert`, `database-integrations`, snapshots, docs | none — pure TypeScript / Markdown                                                                                           |
| `cli`, `runtime-core`, `reactivity` (execution)               | Python 3 + `pip install jinja2`; a venv with `pip install "deepnote-toolkit[server]"`; point `pythonEnv` / `--python` at it |
| `mcp` server                                                  | baseline; to test live, wire into an MCP client (Cursor/Claude) per `packages/mcp/README.md`                                |
| agent blocks / AI features                                    | the execution extras above **plus** an AI provider API key                                                                  |
| db integrations end-to-end (optional)                         | a live DB — Docker for Postgres/MySQL/Mongo, or a cloud account + auth for warehouses (see `docs/<integration>.md`)         |

Release/publish secrets (`NPM_TOKEN`, PyPI trusted publishing, `CODECOV_TOKEN`) are
maintainer-only — never needed for fork contributions.

> Per-story setup is also captured in the gitban roadmap: each `m1/s<n>` story
> description ends with a "Dev setup" clause. Read the relevant node before
> cutting its branch — `read_roadmap(path="m1/s5")`, etc.

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

**Build the `feat/*` branch, then switch straight back to a board branch — never leave the session parked on `feat/*`:** with `.claude/` absent from that working tree the skills silently stop loading (and the `.gitban/` board goes with them), so `/skills` shows nothing and the `gitban-*` skills become un-invokable; the fix is just `git checkout sprint/<tag>` (or `workspace`), which restores both code and tooling in one tree.
