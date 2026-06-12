# Contributing to deepnote (fork workflow)

> Personal dev-setup + contribution-strategy instructions for this clone. Lives on the
> `workspace`/`sprint/*` branches and is pushed only to the public fork — **never** include
> this, or any `.gitban/` / `.claude/` file, in a PR to `deepnote/deepnote`.

## Why a fork

This account (`muunkky`) has only **READ** access to `deepnote/deepnote`, so
contributions go through a fork — you cannot push branches to upstream.
gitban has no "local-only" mode (its board is meant to live in git), so the
board + scaffold are committed and pushed to the public fork instead.

## Remotes & branches

```
upstream = deepnote/deepnote   (read-only source of truth)
origin   = muunkky/deepnote    (your public fork — full write)

main                → tracks upstream/main; a clean mirror. NEVER commit here directly.
workspace           → gitban board + scaffold (.gitban/, .claude/) home base. Pushed to origin/workspace.
sprint/<TAG>        → integrated working branch (the "monolith"): board + planning docs + code for a
                      sprint, co-evolving in lockstep with gitban.
sprint-record/<TAG> → the "with-gitban" process diff for a sprint (board + PRD/ADR/design/spikes + code).
                      A PR on the fork only — never opened against upstream.
contrib/<slug>      → the clean "contribution diff": code only, cut from upstream/main (no .gitban/,
  (legacy: feat/*)    .claude/, or docs/{prds,adr,spikes}). This is the upstream-ready PR.
```

Git HTTPS auth is brokered by the GitHub CLI (`gh auth setup-git`, token scope `repo`).

## Contribution strategy: develop as a monolith, ship as sliced diffs

We work **in lockstep with gitban on the fork**, then slice clean PRs out for upstream.

1. **Develop the monolith on `sprint/<TAG>`.** A sprint's roadmap nodes, PRDs, ADRs, design docs,
   spikes, the gitban board, and the code all co-evolve on one integrated branch. Read-only upstream
   access means our whole product-development lifecycle has to live _somewhere_ versioned — the fork is
   that home, and keeping docs + board + code together is what "monolith" means here (an integrated
   working branch, **not** a monolithic architecture).

2. **Use an upstream issue to showcase and ask — never push unsolicited.** For each body of work,
   comment on an existing `deepnote/deepnote` issue (e.g. #288, #154) or open a new one, describe the
   approach, link the two diffs (below), and _offer_ to open a PR. We open the upstream PR only after a
   maintainer signals interest. (This is the #288 pattern.)

3. **Decompose from monolith.** Developing with Gitban will naturally generate PRs that are many times
   larger than most projects would ever allow. Instead of trying to change our process, we will accept
   that we will create monoliths and then create prs parsed out into smaller diffs/prs that map 1-1 with
   upstream repo expectations. As a result, we will likely have two sets of PRs on our fork: one is the
   final diff from a gitban sprint or batch. The other is diffs that are parcelled out in perfect
   accordance with the contribution guidance that map 1 to 1 with the prs we plan to push upstream 

4. **Slice two diffs per issue — both as PRs on the fork, both linked from the issue:**
   - **Contribution diff (clean / "without gitban")** — branch `contrib/<slug>` cut from
     `upstream/main`: **code only**. No `.gitban/`, no `.claude/`. This _is_ the upstream-ready PR — the
     exact diff we'd open against `deepnote/deepnote` once invited.
   - **Process diff (full / "with gitban")** — branch `sprint-record/<TAG>`: the whole lifecycle —
     board, PRD/ADR/design/spikes, and code. It shows maintainers _how_ the change was reasoned and
     de-risked, not just the result. Stays on the fork.

   The clean diff is what merges upstream; the process diff is showcase/context that never leaves the
   fork.

**Doc boundary (default):** planning docs (`docs/prds/`, `docs/adr/`, `docs/spikes/`) ride only in the
process diff. If a maintainer asks for an ADR/PRD upstream, add _that specific doc_ to the clean PR —
otherwise the contribution diff stays code-only.

## Showcase: a dry run on our own fork (Discussion + per-sprint Issues)

We rehearse the maintainer-facing showcase on our **OWN fork** (`muunkky/deepnote`) first — structurally
identical to the eventual upstream play, so it de-risks the real thing. Nothing goes to `deepnote/deepnote`
yet; once the dry run reads well and we have a diff we're proud of, this same format becomes the template
for the real upstream engagement (the #162/#154 relationship thread + feature offers + the two diffs).

Two tiers, cross-linked:

- **Discussion = the narrative** (one thread for the experiment). A blog/LinkedIn-style opening post — the
  experiment, the fork model, what we're building, the rigor — then one reply per sprint/milestone telling
  the *story* (the why, the de-risking, what the adversarial gates caught, the diff-size story). The
  **opening post is hand-written / approved by Cameron** (prevents overzealousness); record its number
  here: the dry-run thread is **`muunkky/deepnote` Discussion #5** (*Show and tell*).
- **Issues = the technical record, one per SPRINT** (not per node — the roadmap's features stay in gitban).
  **Open** the issue *before* dispatch ("here's the design doc + ADRs + cards I'm about to build", with
  links); **close** it *after* with the result (tests green, the diff, the closeout summary). Cameron
  approves the first issue too.
- **PRs = the diffs** — the process diff (`sprint-record/<TAG>`) and the clean contrib diff
  (`contrib/<slug>`), per the two-diff model above.

Mapping: **milestone → the Discussion opening · sprint (≈ story) → one Issue · feature/node → stays in
gitban (linked, not mirrored).** Cross-link each layer (a sprint's Discussion reply → its Issue → its PR).

- **Label every linked diff** "upstream-ready" or "fork-only showcase."
- **No upstream posting or PRs yet:** nothing goes to `deepnote/deepnote` until we explicitly decide the
  dry run is ready; feature offers then follow the #288 pattern (offer + link both diffs + wait).

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

**Slice the clean contribution diff** out of the sprint monolith onto a branch off `upstream/main`
(no gitban files in the PR). Open the upstream PR only after the issue invites it:

```bash
git fetch upstream
git checkout -b contrib/my-thing upstream/main
git checkout sprint/<TAG> -- <code paths>   # or cherry-pick the code commits
git commit && git push -u origin contrib/my-thing
# open a PR on the FORK, link it (+ the sprint-record process diff) from the upstream issue;
# once a maintainer says yes:
gh pr create --repo deepnote/deepnote --base main --head muunkky:contrib/my-thing
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
