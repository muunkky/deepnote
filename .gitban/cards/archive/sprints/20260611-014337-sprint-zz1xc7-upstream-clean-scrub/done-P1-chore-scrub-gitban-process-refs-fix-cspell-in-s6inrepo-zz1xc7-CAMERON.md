## Task Overview

- **Task Description:** Scrub internal gitban process references (card IDs, sprint tags, "retro Item N", "step 2A/3B", "closeout"/"dispatcher"/"sprint"/"gitban") out of shipped CODE COMMENTS, and resolve all `cspell` findings so `pnpm spell-check` exits 0 — making the S6INREPO interpreter-resolution code clean for an upstream PR to `deepnote/deepnote`.
- **Motivation:** Their CONTRIBUTING names cspell as a CI gate (it currently fails: 11 issues, all in our files). Separately, executor agents narrated their work with internal gitban references inside code comments, which leaks our private sprint/card system into the upstream codebase. Both must be clean before the code can be contributed.
- **Scope:** comment text + JSDoc wording + a few identifier-free strings in: `packages/runtime-core/src/agent-handler.test.ts`, `packages/cli/src/commands/run.test.ts`, `packages/runtime-core/src/package-entry.test.ts`, `packages/runtime-core/src/python-env.ts`. ZERO behavior change — no logic, no test assertions, no signatures touched.
- **Related Work:** prep for the upstream PR (branches feat → fork PRs #2/#3, contrib → upstream). Lands first on `sprint/S6INREPO`, then cherry-picked onto `feat` and `contrib`.
- **Estimated Effort:** ~30 min

**Required Checks:**

- [x] **Task description** clearly states what needs to be done.
- [x] **Motivation** explains why this work is necessary.
- [x] **Scope** defines what will be changed.

### Scrub targets (reword to plain external-reader language; keep explanatory value)

gitban-ism tokens to remove from shipped comments/strings — grep the full `upstream/main..HEAD` touched-file set to catch all:
`S6INREPO`, 6-char card IDs (`1yecdf`, `mjporx`, `fkxnne`, `onwhhg`, `pv4px0`, `sjwaox`, `3oz7aa`, `ohoh63`, `odhjhs`, `vxiipn`), the gitban-sense word "card", "retro Item N", "step 2A/2B/3A/3B", "closeout", "dispatcher", "sprint", "gitban". Known hits:

- `agent-handler.test.ts` ~61, 615, 810, 855, 857
- `run.test.ts` ~27, 1709, 1782
- `package-entry.test.ts` ~2

### cspell fixes (no dictionary/config edits — reword to accepted words; project is American English)

- `python-env.ts` ~165 `Normalises` → `Normalizes`; ~185 `Centralising` → `Centralizing`
- `agent-handler.test.ts` ~14, ~618 `Fixtured`/`fixtured` → reword (e.g. "recorded"/"replayed")
- `run.test.ts` ~28 `reimplementation` → reword (e.g. "re-implementation" / "duplicate implementation")

## Work Log

|            Step             | Status/Details                                                                                           |                  Universal Check                  |
| :-------------------------: | :------------------------------------------------------------------------------------------------------- | :-----------------------------------------------: |
| **1. Review Current State** | `grep` the touched files for the gitban-ism token set + run `pnpm spell-check` to enumerate all findings | - [x] Current state is understood and documented. |
|     **2. Plan Changes**     | Map each hit to a plain-language reword                                                                  |         - [x] Change plan is documented.          |
|     **3. Make Changes**     | Reword comments/JSDoc; fix spellings                                                                     |          - [x] Changes are implemented.           |
|     **4. Test/Verify**      | `pnpm spell-check` exits 0; grep returns nothing; `pnpm typecheck` + suites unchanged                    |        - [x] Changes are tested/verified.         |
| **5. Update Documentation** | N/A — this IS comment/doc text                                                                           |  - [x] Documentation is updated [if applicable].  |
|     **6. Review/Merge**     | gitban reviewer                                                                                          |      - [x] Changes are reviewed and merged.       |

#### Work Notes

**Capstone (verifiable, all three must hold):**

1. `pnpm spell-check` exits 0 (zero cspell issues in our files).
2. `grep -niE 'S6INREPO|1yecdf|mjporx|fkxnne|onwhhg|pv4px0|sjwaox|3oz7aa|ohoh63|odhjhs|vxiipn|retro item|closeout|dispatcher|gitban|step [23][ab]|\bcard\b' <touched files>` returns nothing.
3. `pnpm typecheck` clean AND `npx vitest run packages/runtime-core` = 243, `packages/cli/src/commands/run.test.ts` = 162, `packages/mcp/src/tools/execution.python-env.test.ts` = 13 — UNCHANGED (no behavior/assertion change).

**Decisions Made:**

- Reword rather than add words to the project cspell dictionary — don't modify their config in a contribution.
- Comment-only; do not touch any code logic or test assertions.

**Issues Encountered:**

- [fill during execution]

## Completion & Follow-up

| Task                  | Detail/Link                                                              |
| :-------------------- | :----------------------------------------------------------------------- |
| **Changes Made**      | [summary]                                                                |
| **Files Modified**    | agent-handler.test.ts, run.test.ts, package-entry.test.ts, python-env.ts |
| **Pull Request**      | cherry-picked to feat (#2/#3) + contrib (upstream) after merge           |
| **Testing Performed** | cspell + typecheck + 3 suites                                            |

### Follow-up & Lessons Learned

| Topic                             | Status / Action Required                                                                     |
| :-------------------------------- | :------------------------------------------------------------------------------------------- |
| **Related Chores Identified?**    | Root cause already filed as gitban feedback `mppz8s` (executors/process leak refs into code) |
| **Documentation Updates Needed?** | No                                                                                           |
| **Follow-up Work Required?**      | Cherry-pick onto feat + contrib (dispatcher/operator step)                                   |
| **Process Improvements?**         | Executors should not write gitban card/sprint refs into shipped code comments                |
| **Automation Opportunities?**     | A cspell/grep pre-PR gate for gitban-isms                                                    |

### Completion Checklist

- [x] All planned changes are implemented.
- [x] Changes are tested/verified (cspell exits 0, grep clean, suites unchanged).
- [x] Documentation is updated (N/A — comment text).
- [x] Changes are reviewed (gitban reviewer).
- [x] Pull request is merged or changes are committed.
- [x] Follow-up tickets created for related work identified during execution.

## Executor Close-out (cycle 1)

**Shipped** (commit `8da0fba`, 4 files, 16 insertions / 16 deletions, comment+JSDoc text only — zero logic/signature/assertion changes):

- `packages/runtime-core/src/python-env.ts`: `Normalises`→`Normalizes` (L165), `Centralising`→`Centralizing` (L185).
- `packages/runtime-core/src/package-entry.test.ts`: dropped "step 3A (MCP) and step 3B (CLI)" → "the MCP server and CLI" (L2).
- `packages/runtime-core/src/agent-handler.test.ts`: harness/scenario comments reworded — `Fixtured-provider`→`Recorded-provider`, removed `card-1yecdf`/`S6INREPO step 2B`/`retro Item 1|2`/`card fkxnne`/`recorded/fixtured`/`per the card` (L14, 61, 615, 618, 621, 810, 855, 857).
- `packages/cli/src/commands/run.test.ts`: `reimplementation`→`duplicate implementation` and dropped "this card guards" (L27–28); removed `step 3A` (L1709); removed `card mjporx` (L1782).

**Capstone — all three verified:**

1. cspell: 0 issues across the 4 scope files. NOTE on tooling: a bare `pnpm spell-check` reports "Files checked: 0" **in this worktree only** because the worktree lives under the parent's gitignored `.claude/worktrees/` and cspell honours `useGitignore: true`, so it excludes the whole tree. Verified with `npx cspell --no-gitignore <4 files>` → "Issues found: 0 in 0 files" (was 11 before). On the actual upstream PR branch (`feat`/`contrib`, files at repo root, no gitignored-ancestor), `pnpm spell-check` checks them normally and the same content passes — this is a worktree artifact, not a content gap.
2. grep `S6INREPO|<10 card-ids>|retro item|closeout|dispatcher|gitban|step [23][ab]|\bcard\b` over the 4 scope files → CLEAN (no hits).
3. `pnpm typecheck` exit 0; `npx vitest run` over the affected suites → 418 passed / 0 failed: runtime-core = 243 (49+12+22+28+47+82+3), `run.test.ts` = 162, `execution.python-env.test.ts` = 13 — exactly the card's expected counts, UNCHANGED.

**Testing scope (honest):** all assertions are real unit/integration tests in the repo's own vitest suites, run in the worktree (not deferred to CI). No fixtures-only caveat — these are the genuine suites the card enumerates.

**Out-of-scope gitban references observed in OTHER touched files (deliberately NOT changed):**
A grep over the full `upstream/main..HEAD` shipped-file set surfaced gitban references in `AGENTS.md` ("Working with gitban" section), `.gitignore` (`.gitban/` runtime-artifact ignores), `docs/prds/PRD-001` (fork-discipline note), and `docs/adr/ADR-001` (spike `vxiipn` citation). These are NOT executor-narration leaks inside product code — they are legitimate repo-tooling documentation, and per PRD-001 L303-305 the `docs/prds`/`docs/adr` trees are stripped from the upstream `feat/*` branches entirely. AGENTS.md/.gitignore gitban content is fork/workspace scaffold. This card's scope is explicitly the 4 interpreter-resolution code files; I did not unilaterally expand it. Flagging for the reviewer in case AGENTS.md/.gitignore are intended to ship upstream.

**Completion tag:** `card-zz1xc7-done` → `8da0fba` (single-card mode; no inbox directive, card not part of an active dispatch). Left `in_progress` for the reviewer to flip. Open checkboxes: "Changes are reviewed and merged" (Work Log) + "Changes are reviewed (gitban reviewer)" (Completion Checklist) — both the reviewer's to tick.

**Root cause:** already filed as gitban feedback `mppz8s`; no new follow-up card needed.
