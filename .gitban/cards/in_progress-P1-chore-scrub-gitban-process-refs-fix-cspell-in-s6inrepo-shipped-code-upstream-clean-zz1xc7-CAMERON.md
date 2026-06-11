## Task Overview

- **Task Description:** Scrub internal gitban process references (card IDs, sprint tags, "retro Item N", "step 2A/3B", "closeout"/"dispatcher"/"sprint"/"gitban") out of shipped CODE COMMENTS, and resolve all `cspell` findings so `pnpm spell-check` exits 0 — making the S6INREPO interpreter-resolution code clean for an upstream PR to `deepnote/deepnote`.
- **Motivation:** Their CONTRIBUTING names cspell as a CI gate (it currently fails: 11 issues, all in our files). Separately, executor agents narrated their work with internal gitban references inside code comments, which leaks our private sprint/card system into the upstream codebase. Both must be clean before the code can be contributed.
- **Scope:** comment text + JSDoc wording + a few identifier-free strings in: `packages/runtime-core/src/agent-handler.test.ts`, `packages/cli/src/commands/run.test.ts`, `packages/runtime-core/src/package-entry.test.ts`, `packages/runtime-core/src/python-env.ts`. ZERO behavior change — no logic, no test assertions, no signatures touched.
- **Related Work:** prep for the upstream PR (branches feat → fork PRs #2/#3, contrib → upstream). Lands first on `sprint/S6INREPO`, then cherry-picked onto `feat` and `contrib`.
- **Estimated Effort:** ~30 min

**Required Checks:**

- [ ] **Task description** clearly states what needs to be done.
- [ ] **Motivation** explains why this work is necessary.
- [ ] **Scope** defines what will be changed.

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
| **1. Review Current State** | `grep` the touched files for the gitban-ism token set + run `pnpm spell-check` to enumerate all findings | - [ ] Current state is understood and documented. |
|     **2. Plan Changes**     | Map each hit to a plain-language reword                                                                  |         - [ ] Change plan is documented.          |
|     **3. Make Changes**     | Reword comments/JSDoc; fix spellings                                                                     |          - [ ] Changes are implemented.           |
|     **4. Test/Verify**      | `pnpm spell-check` exits 0; grep returns nothing; `pnpm typecheck` + suites unchanged                    |        - [ ] Changes are tested/verified.         |
| **5. Update Documentation** | N/A — this IS comment/doc text                                                                           |  - [ ] Documentation is updated [if applicable].  |
|     **6. Review/Merge**     | gitban reviewer                                                                                          |      - [ ] Changes are reviewed and merged.       |

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

- [ ] All planned changes are implemented.
- [ ] Changes are tested/verified (cspell exits 0, grep clean, suites unchanged).
- [ ] Documentation is updated (N/A — comment text).
- [ ] Changes are reviewed (gitban reviewer).
- [ ] Pull request is merged or changes are committed.
- [ ] Follow-up tickets created for related work identified during execution.
