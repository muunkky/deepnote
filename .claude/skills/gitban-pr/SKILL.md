---
name: gitban-pr
description: Writes a well-structured draft Pull Request for the current branch targeting main.
hooks:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "bash ./.gitban/hooks/validate-no-direct-gitban-state-edit.sh"
---

Write a Pull Request that lands a gitban sprint or feature branch on main.

You start with clean context — you were not involved in executing the work. Read the finished work objectively and write for a human reviewer who knows nothing about your internal workflow.

## What a good PR is for

A PR is not a change log. A change log is a flat list, ordered by file or commit, and it answers "what got touched." A reviewer can reconstruct that themselves from the diff in thirty seconds. They cannot reconstruct **why this change exists, why it took this shape, and what is now true about the system that wasn't true yesterday** — that's the work the PR has to do.

So the PR is a short piece of technical writing whose job is to make a stranger feel the journey: the constraint that motivated the work, the capability that lands, the design fork that was chosen and the one that was rejected, and finally the concrete shape of the thing and the evidence it works. A reviewer who finishes reading should be able to (a) state in their own words what's now possible, (b) name the design choice you made and the alternative you rejected, and (c) point to the artefact that proves it works. If they can do all three, the diff review becomes verification, not investigation.

This is not literary indulgence. It's how reviewers stay fast on PRs they didn't author. The frame ("here's what's now possible, here's the choice we made, here's the thing") loads the reviewer's working memory in the right order so the diff makes sense as soon as they open it.

## The five-beat arc that makes a PR readable

For every distinct capability this PR ships, walk these five beats in this order. The first three set the stage; beats four and five make the change verifiable. Skip nothing — but match depth to significance.

1. **The constraint.** What was the world like before? What couldn't be done, or what kept biting people? One or two sentences for a small change; a full paragraph if the constraint itself is non-obvious. This is your hook into a stranger's head — without it, beat 2 has nothing to push against.
2. **What's now possible.** Voiced positively, in the reader's terms. *Not* "we added X" — "after this, X works" or "Y stops happening" or "Z is now expressible." This is the sentence the reviewer remembers and the line they'll quote when they explain the PR to a teammate. Land it cleanly.
3. **Why this design.** The fork in the road. What alternative would someone naturally reach for, and what made it worse? Every nontrivial change has a fork; surface it. If a reviewer can finish reading and still ask "but why didn't you just…?", the PR has skipped this beat. (If the design was genuinely forced — only one workable shape — say so in one sentence and move on. The bar for "forced" is high; "this seemed obvious to me" doesn't clear it.)
4. **What it looks like.** A concrete artefact. Code snippet, config block, transcript, error message before-and-after, screenshot, a representative diff hunk. If you can't show the thing in twenty lines or fewer, you don't understand it well enough to PR it. *No* "see the diff" or "as documented in ADR-X" hand-offs — the reviewer is reading the PR before they open the diff.
5. **How we know it works.** Validation specific to *this* capability — the failing-then-passing test, the integration run, the worked example, the manual repro. Cross-cutting validation (full suite green) goes in a single trailing section, not repeated per beat.

A PR that ships five capabilities walks this arc five times. There is no "lead with motivation" section that absolves the rest of the document — every shipped capability gets its own arc where it's introduced.

### Why the order matters

The order is **constraint → capability → choice → shape → proof** because that's how a reader who doesn't yet care comes to care, then evaluates. Reverse any two and the writing degrades:

- Lead with shape (a code snippet) and the reader has no frame for what they're looking at.
- Lead with capability before constraint and the reader has no reason to want the capability.
- Bury the design choice after the artefact and the reader will mentally redesign the thing while reading the diff, then resent that you didn't address their alternative.
- Skip proof and the reviewer has to invent the validation themselves.

## Writing the design-choice beat

The design-choice beat is what most PRs miss, so it gets its own treatment. A good design-choice paragraph has three moves: **the alternative** (what someone would naturally reach for), **the deciding factor** (the cost or constraint that made the alternative worse), and **the price you accepted** (what trade-off the chosen design costs you in return). Naming the price is the move that signals you actually thought about it; without it, the paragraph reads like a sales pitch.

**Anaemic:**

> We chose typed dataclasses for the config because they're safer.

The reviewer learns nothing. "Safer than what? At what cost?" is unanswered.

**Strong:**

> The obvious shape was a flat dict — fewer files, no schema to maintain, easy to extend. We chose typed dataclasses because adopters hand-edit these YAML files in production, and with a dict an unknown field silently no-ops at parse time, then the feature mysteriously doesn't work three weeks later. Dataclasses fail at parse time with a path to the bad field. The price: every new field is a code change in two places (the dataclass and the parser), not one.

Three moves, named cleanly: alternative (flat dict), deciding factor (silent failure mode for end users), price (two-place edits).

The bar for "no design choice to write about" is high. Most genuinely-forced designs are forced because of an upstream choice that *was* a fork — surface that one. If the work is so trivial there's no fork at any level (a typo fix, a one-line constant change), collapse the arc into a single short paragraph and move on.

## The lede: what a multi-capability PR opens with

A PR that ships more than one capability needs **one paragraph above the per-capability sections** that does two things: it names the unifying capability at the scope of the whole PR ("after this branch, X is true"), and it signals **why these things ship together** — the insight, constraint, or theme that made them belong in one cut. Without this paragraph, the PR reads as a stapled list of unrelated work.

**Stapled-list lede (bad):**

> This branch ships three things: a config override system, a bug fix for empty YAML, and updated test fixtures.

**Unifying lede (good):**

> Until this branch, every adopter who customised a default forked the whole config file — diverging from upstream, missing future fixes, and forcing manual merges on every release. This branch closes that loop: adopters now ship a small override file that merges with upstream defaults at load time, with three resolution strategies (replace, deep-merge, append) chosen explicitly per field. The empty-YAML fix and fixture updates are scaffolding for that change — surfaced separately because they have value on their own and a reviewer will see them in the diff.

Same artefacts, but the second version tells the reader **what's now possible at the scope of the whole branch** and **why the smaller items belong here**. A reviewer who reads only the lede should be able to predict the per-capability sections that follow.

For a single-capability PR, you don't need a separate lede — the first beat of the arc is the lede.

## The failure mode this all prevents: name-but-don't-explain

The single most common bad-PR pattern is enumerating internal artefacts by their internal nomenclature without ever explaining what they do or why they exist. It happens because the author is *too close* to the work — every internal name feels self-evident.

**Bad:**

> Sprint-closeout reviewer Gate 0 — cite-affordance contract (`<!-- cite: kind=… ref=… -->` per ticked checklist row), 793-line `gate0.py` reconciler, 29-test suite including the `9padx1`-shaped fixture (which MUST FAIL — the regression bar).

The reader knows things exist. They do not know what those things do, what changes for them after merge, what alternative was rejected, or how they'd verify any of it. Every term is an internal pointer (`Gate 0`, `cite-affordance`, `9padx1`, "regression bar"). A reviewer who didn't work on this sprint cannot tell what the PR delivers.

**Good (full five-beat arc, with internal names mostly hidden):**

> **The constraint.** Closeout reviewers accepted prose. "All tests passing ✅" was a string, not a claim. A closeout could tick boxes that contradicted its own retrospective body and the review would notice nothing — a sprint could be marked done while its own retrospective said otherwise.
>
> **What's now possible.** A closeout that ticks "all tests passing" cannot be merged unless that claim resolves to a real CI run with the right shape. Three failure modes are now structurally unrepresentable: a tick with no evidence, a tick whose evidence resolves to contradicting state, and a tick whose only evidence is the closeout citing itself.
>
> **Why this design.** The natural alternative was an LLM-as-judge reviewer that reads the prose and flags inconsistencies. We rejected it because LLM judgement on its own retrospective is too easy to slip past — the model that wrote the contradiction is not reliably the one to catch it. A structural rule (every tick carries a typed cite that resolves to external state) is verifiable by a tiny script and cannot be talked around. The price: writers must learn the cite syntax, and we accept friction on the first few closeouts.
>
> **What it looks like.** Every ticked box on the upper checklist now carries a typed evidence cite:
>
> ```markdown
> - [x] All tests passing on sprint branch <!-- cite: kind=ci ref=run/12345 -->
> - [x] Card abc123 done and archived <!-- cite: kind=card ref=abc123 -->
> ```
>
> A reconciler walks the checklist, parses each cite, resolves it against external state (the CI API, the card store), and emits a per-row verdict. A self-citation (`kind=closeout ref=self`) is a hard error.
>
> **How we know it works.** The contract self-applied to its own installer card during closeout. First run found 1 real contradicted-cite — author corrected. Second run passed 14/14. The 29-test suite includes one fixture that *must fail* (`9padx1` — a closeout with a self-citing tick); a green run on that fixture would mean the reconciler is broken.

Same artefacts, same internal names available where they pull weight (the fixture name appears once, in the validation section, where it makes the test surface concrete). But every claim is anchored to a behaviour change a reviewer can verify, with the design choice surfaced and the alternative explicitly addressed.

**The tell:** if your draft section reads as a glossary entry — sentences whose subjects are internal compound nouns, IDs, or sprint tags ("the cite-affordance contract", "the packed-card rejection rule", "Gate 0") — you are naming, not explaining. Replace with the five-beat arc.

## Before you start

1. **Fetch the latest**: Run `git fetch origin` so your diff is against the current remote, not a stale snapshot. If the base branch has moved significantly ahead, note this in the PR so the reviewer knows a rebase may be needed.
2. **Check for an existing PR**: Run `gh pr list --head $(git branch --show-current)` to see if a draft already exists. If one does, read its comments with `gh api repos/{owner}/{repo}/pulls/{number}/comments` and `gh api repos/{owner}/{repo}/issues/{number}/comments`. Look for unaddressed reviewer feedback — anything not yet resolved should be acknowledged in the updated PR body or fixed before rewriting. Don't silently drop feedback someone took the time to leave.

## Gathering context

Build understanding from every source available. The five-beat arc is hungry — beat 3 (design choice) and beat 1 (constraint) need real material, not platitudes. Mining for it is most of the work.

- **Cards**: `list_cards` with the sprint filter and `include_archived: true`. Read each done card — titles, types, acceptance criteria, review logs, executor summaries. Read deferred/backlog cards to understand what was explicitly *not* done. Pay special attention to **comments and review notes** — that's where design forks and alternatives-rejected get recorded in plain language.
- **Changelog**: `CHANGELOG.md` for the curated version entry.
- **Roadmap**: `read_roadmap` if the sprint or card references a milestone — the milestone framing often *is* the unifying capability for the lede.
- **Code**: `git log origin/main..HEAD --oneline` and `git diff origin/main..HEAD --stat`. Use `origin/main` — local main may be stale.
- **Documentation**: `git diff origin/main..HEAD -- docs/adr/ docs/designs/ docs/prds/`. ADRs are gold for beat 3 — they were written precisely to record design choices and rejected alternatives. Quote them, don't just cite them.
- **Concrete artefacts**: actual code snippets, config files, error messages, command output. Beat 4 demands these. Find them now so you can quote them later.

The research powers the PR — the research artefacts themselves do not appear in the output. **Card titles and DoD bullets are not explanations.** They are pointers for people who already understand. Your job is to translate from artefact-pointer to behaviour-change.

### What gitban gives you that other PR authors don't have

- **Review logs** — what reviewers caught and what got fixed. Use this to populate beat 5 (validation) with non-fabricated evidence; also a rich source for beat 3 when the review caught a design alternative the author had to argue against.
- **Conscious deferrals with reasoning** — preempts "but why didn't you just…?" before the reviewer asks. Often the seed of beat 3.
- **Root-cause analysis from bug cards** — multi-iteration investigation logs that make beat 1 (the constraint) precise rather than hand-wavy.
- **Scope boundaries** — what was explicitly rejected and why. This belongs in beat 3 when the boundary is non-obvious.

Mine for these. Use what makes a particular section more concrete; drop the rest. Match depth to significance.

## Section reference

A PR organised around the five-beat arc lays out naturally as one or more H2/H3 sections per capability, plus a few connective sections. Use what fits; omit what's empty. The first nine rows are the structural skeleton of any PR; the **scope-driven beats** at the bottom of the table are added when the PR's character (external repo, ambiguous spec, production blast radius) calls for them.

| Section | Purpose | Include when |
| :--- | :--- | :--- |
| **Lede** (untitled, top of PR) | One paragraph naming the unifying capability and why these things ship together. | Any PR with more than one capability. |
| **TL;DR or Summary** | A compact bulleted list of what shipped, for the reviewer who wants the headline before the prose. Sits below the lede. | Any PR with three or more capabilities or more than ~20 files changed. |
| **Per-capability sections** | The five-beat arc, one per shipped capability. Use H2 if the capability is a top-level theme; H3 if it's a sub-capability under a theme. | Always. This is the body of the PR. |
| **Immediate fixes** | Capabilities that are unblockers / hygiene rather than new platform — still get the five-beat arc, just shorter (often one paragraph per beat condensed into one paragraph total). Group under one H2 if they share a motivation. | When the PR mixes new platform with cleanup. |
| **Validation** | Cross-cutting verification that doesn't fit any single capability (full-suite results, integration runs, manual testing). | When validation evidence spans multiple capabilities. Per-capability validation goes inside each capability's section. |
| **Risks and limitations** | What doesn't work yet, has caveats, or could surprise someone after merge. | When there are known gaps, deferred work, partial coverage, paywalled dependencies, etc. |
| **How to review** | Ordered checklist of files and the reading order that makes the diff readable. | Diff is large (20+ files) or mixes production with boilerplate/generated. |
| **Follow-up work** | What was identified but not completed, in plain language. Cite the destination (backlog vs. specific future sprint) — "deferred" alone is useless. | When work was explicitly descoped. |
| **Breaking changes** | What downstream consumers must do differently. | Only when behaviour, APIs, or interfaces changed. |
| **Linked issue** *(scope-driven)* | A one-line marker near the top of the body — `Fixes #123`, `Closes #456`, or `Refs #789` — so reviewers can find the original ask. Conventional in most external repos and many internal ones; the GitHub keyword closes the issue automatically on merge. | Always when contributing to an external repo. Optionally when the PR resolves a tracked issue and the link helps reviewers find the originating discussion. |
| **Assumptions made** *(scope-driven)* | Short prose or a bulleted list naming judgment calls made where the spec was ambiguous — interpretations the reader should sanity-check. "Treated 'soon' in the requirement as 'within 24h'." "Assumed the deduplication key is the email, not the user ID — flag if wrong." Surfaces silent decisions before they ship. | Whenever the work involved interpretation of underspecified requirements. The further the spec was from a literal one-to-one task, the more this section pulls its weight. |
| **Rollback / revert plan** *(scope-driven)* | How to revert cleanly if this breaks after merge. Names what reverts safely (a code-only change reverts with a `git` revert), what doesn't (a migration that ran, a queue that drained, an API consumer that already migrated), and the recovery steps for the parts that don't. | When the change touches production runtime, runs an irreversible operation (migration, data backfill, key rotation), modifies a live API surface, or alters deployment/rollout configuration. Skip for pure documentation, internal-only refactors, and tooling changes. |

For a small one-thing PR (a refactor, a bug fix, a rename) the five-beat arc collapses into a few short paragraphs. Don't pad. Don't invent sections.

## Form follows enumeration

When a section lists three or more of-a-kind items — failure modes, follow-ups, validation checks, cite types, file groups, error codes, deferred cards — reach for a table. A bullet list with each line packed full of internal compound nouns reads like a glossary. A table with columns puts the comparison axes in the column headers, where the eye expects them, and frees each row to be short.

Code blocks (``` ```) for syntax, configs, CLI invocations, error messages, before/after snippets. They satisfy beat 4 of the arc more cleanly than prose.

Callouts (e.g. `**⚠️ Not yet live.**`) for risks the reviewer should not skim past.

## Adaptive shape by PR character

- **Feature PR**: five-beat arc directly. Each feature is a section.
- **Bug fix**: beat 1 is the bug (with reproducer if non-obvious), beat 2 is what now works that didn't, beat 3 is why this fix and not a more local patch (often "the local patch hides the class of bug; this fix prevents recurrence"), beat 4 is the failing-then-passing test or the corrected output, beat 5 is regression coverage. For a one-line fix, collapse beats 1–3 into one short paragraph.
- **Refactor**: beat 1 is the constraint the old shape created, beat 2 is what the new shape unlocks, beat 3 is why this shape and not a milder rearrangement, beat 4 is a representative diff hunk that shows the call-site improvement, beat 5 is "no behaviour changed; full suite green."
- **Sprint PR with multiple capabilities**: lede + (optional TL;DR) + one H2 per capability, each with the five-beat arc inside. The reviewer skims the lede and TL;DR, deep-reads the sections that matter to them.
- **Validation/test-only PR**: lead with the constraint (what was untestable or under-covered), then what's now covered. Each test surface gets its own arc. Beat 4 is the test code; beat 5 is the run output.

## PR title

- Sprint: `sprint/{SPRINTTAG}: [what's now possible, in plain language]`
- Feature: `feature/{card-id}: [card title in natural language]`

The title should tell the reviewer what this PR makes true, not what cards were touched. If you can't write a plain-language title, beats 1–2 of the arc are incomplete somewhere — go fix that first.

## Submitting

1. Push the source branch, pinned to the parent worktree (the resolver recomputes the parent repo root regardless of worktree CWD drift): `PARENT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")" && git -C "$PARENT" push -u origin {branch}`.
2. Write the PR body to a project-local scratch file at `tmp/pr-body.md` using the Write tool. Project-local, never `/tmp/`: system temp is platform-dependent (missing on Windows, world-readable on shared boxes), can be wiped mid-session, and survives across unrelated repos. The `tmp/` directory at the project root is gitignored; the Write tool creates it on first use. Never use heredocs or shell quoting for PR bodies — they mangle markdown.
3. Create the PR as a draft: `gh pr create --draft --title "..." --body-file tmp/pr-body.md`. Always `--draft`.
4. Clean up the scratch file after successful creation.
5. If `gh` is unavailable, keep the draft markdown file and report the path.
6. Return the PR URL.

## Self-check before submitting

Read your draft like a stranger who joined the project this week. For each section:

- Beat 1: Can you point to a sentence that names the constraint? Not "we wanted to add X" but "X kept biting because Y."
- Beat 2: Can you point to a sentence whose subject is **the user or the system** and whose verb is positive ("can now", "no longer", "is expressible as") — not a sentence whose subject is "we" and whose verb is "added"?
- Beat 3: Can you point to the **rejected alternative** by name? If your design-choice paragraph mentions only the chosen design and not what it beat, beat 3 is missing.
- Beat 4: Can you point to a concrete artefact (code, config, transcript)? "See the diff" is not an answer.
- Beat 5: Can you point to validation specific to *this* capability, not just "all tests pass"?

Did you write any sentence whose subject is an internal name (`Gate 0`, `5oixhb`, "the cite-affordance contract") rather than a behaviour or a change? Rewrite it.

For a multi-capability PR, does the lede let a reviewer predict the sections below? If they couldn't write the section headings from the lede alone, the lede is doing description but not unification.

For each scope-driven beat (linked issue, assumptions made, rollback plan), ask:

- **Linked issue**: contributing to an external repo or resolving a tracked issue? The `Fixes #N` line is one line — the cost of including it is zero, the cost of forgetting it is a manual issue close and a reviewer hunt.
- **Assumptions made**: did the work involve any interpretation of an ambiguous spec? If yes, did you write down the interpretations the reader should sanity-check? An unflagged judgment call is the most likely place a misunderstanding lands.
- **Rollback plan**: does this PR touch production runtime, run a migration, change an API surface, or alter deploy config? If yes, can a reader name how to revert each affected piece without re-reading the diff?

If any answer is no on a non-trivial section, fix it before submitting.

## Attribution

When gitban was used to organise the work, end the main body with:

```
---
Planned and tracked with [gitban](https://github.com/muunkky/gitban-mcp).
```

Visible to everyone, not buried in a collapsible. The quality of the PR is the advertisement; this line just tells curious readers where to look. Include it even when contributing to external repos that don't use gitban — if gitban organised the work, the attribution belongs. Omit it only if gitban wasn't used for the branch.

## Gitban details (collapsible)

Below the attribution, include a collapsed `<details>` section for teammates who use gitban. This is the only place where internal IDs (card IDs, sprint tags, roadmap paths) belong as the primary reading surface — the main body told the story; this section navigates the workflow context.

```markdown
---

<details>
<summary>Gitban details</summary>

### Sprint

{SPRINTTAG} — one-line origin or theme.

### Roadmap

`m2/s2 "Auth and Access Control"` — story purpose; how this PR advances it.

### Cards delivered

| ID | Type | Title | Key outcome |
|----|------|-------|-------------|
| `abc123` | feature | Config override system | Adopter YAML merges with defaults; 3 resolution strategies validated |
| `def456` | bug | YAML parse crash on empty input | Root cause: missing None guard; added error wrapping with file path + line |

### Deferred work

| ID | Title | Destination | Reason |
|----|-------|-------------|--------|
| `ghi789` | Path traversal guard | Backlog (unscheduled) | Needs design review before implementation |
| `jkl012` | Write lock for key store | `m2/s3` tenant isolation sprint | Deferred to database migration |

### Review insights

Cards `def456` and `mno345` went through rework cycles — reviewer caught a leaked private import and a silently dropped test during merge conflict resolution. Both fixed before approval.

### Sprint metrics

- **Completed**: 5 cards (2 feature, 2 bug, 1 chore)
- **Deferred**: 2 cards (1 backlogged, 1 scheduled for `m2/s3`)
- **Rework cycles**: 2
- **Changelog**: `v1.2.0-m5.1`

</details>
```

**Required content:**

- **Cards delivered table** — one row per done card. The "Key outcome" column is what makes this section pull its weight: a 1–2 phrase summary of what the card *actually accomplished*, drawn from the card's exit criteria. Not the title restated, not the DoD checklist verbatim.
- **Deferred work table** — for each deferred card, the **destination** (specific sprint or backlog with priority, not just "later"). If the destination is unclear, flag it ("destination unclear — may need triage").
- **Roadmap path** — full notation (`m2/s2 "Title"`), with the story's purpose and where this PR sits in it. Skip if the work isn't on a roadmap.
- **Sprint metrics** — completion counts by type, rework cycles, deferred counts with disposition.

**What does NOT belong here:** ADRs, design docs, runbooks. Those belong in the main body where every reviewer can see them. The collapsible is exclusively for gitban-internal organisational data.

**What to leave out:** handle assignments, timestamps (git log has these), raw card content, the attribution line.

For a single-card PR the section can be minimal — card ID, roadmap path if relevant, and any deferred follow-ups. Don't pad.

Omit the entire section if gitban wasn't used for the branch.

## .gitban content in PRs

The `.gitban/` directory is a local/fork workflow artefact. Do not include `.gitban/` content in PRs targeting repositories that don't use gitban. A pre-push hook enforces this when isolation is configured. If the push is blocked, the hook says why and how to fix it. If isolation isn't configured for the target remote, run the MCP `isolate_remote_tool`.

## Anti-patterns

- **Change-log voice.** Sentences whose subject is "we" or "this PR" and whose verb is "adds/updates/refactors". A reviewer reading "we added X" learns nothing they couldn't get from the diff. Rewrite as "X now does Y" or "Y is now possible because of X" — subject the system, predicate the behaviour change.
- **Name-but-don't-explain.** Sentences whose subjects are internal compound nouns or IDs ("the cite-affordance contract", "the packed-card rejection rule", "Gate 0"). Replace with the five-beat arc. Worked example earlier in this skill.
- **Missing design choice.** A capability section that names the chosen design but never the rejected alternative. The reviewer will mentally redesign the change while reading and resent that you didn't address their alternative. Surface the fork.
- **Stapled-list lede.** A multi-capability PR opening with "this branch ships A, B, and C" instead of a paragraph that unifies them. The lede is what makes the per-capability sections feel like one PR rather than three coincident PRs.
- **Process transcript.** "We read 18 cards, dispatched 5 executors…" The reviewer does not need the workflow narrative. They need the result.
- **Tables of internal tracking artefacts in the main body.** Sprint metrics, card inventories, dispatch logs — all belong in the gitban-details collapsible. The main body's tables hold information the reviewer needs (file paths, test results, API surfaces, failure-mode comparisons).
- **Unread claims.** Never conclude something is "missing" without reading it. Metadata listings show structure, not content. Read the actual card/roadmap content before claiming absence.
- **Active-only summary on a sprint PR.** Inspect done/archived cards too. The PR covers all work on the branch, including finished items.
- **Beat-4 evasion.** Phrases like "see the diff" or "as documented in ADR-X" instead of a concrete artefact. The reviewer is reading the PR before the diff. Show the thing.

## Constraints

- Use gitban MCP tools for card interactions. Do not read or edit files in `.gitban/cards/` directly.
- No co-authored-by lines in commits.
- **Pre-commit hooks must run on every commit you make.** Executor / reviewer / planner / router skip hooks on intermediate commits during card work; the PR agent is the merge gate. Run hooks; never `--no-verify`. If hooks fail, fix the underlying issue.
- Use `origin/main` for diffs, not local `main`.
- Always create PRs as draft (`--draft`).
