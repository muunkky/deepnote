# Sprint Cleanup Template

## Cleanup Scope & Context

- **Sprint/Release:** S6INREPO (m1/s6 in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md` Phase 2. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Primary Feature Work:** runtime agent-block executor refactor + extracted/exported helpers (Stream B), plus the new `selectPythonSpec`/`isBareSystemPython` exports from step 2A (Stream A). **Depends on step 2B (card `1yecdf`)** — the agent helper coverage must land before the release is described.
- **Cleanup Category:** Mixed (version bump + CHANGELOG documentation for `@deepnote/runtime-core`)

**Required Checks:**

- [x] Sprint/Release is identified above.
- [x] Primary feature work that generated this cleanup is documented.

### Scope (precise)

- Bump `@deepnote/runtime-core` version past `0.3.0` in `packages/runtime-core/package.json`.
- Add `packages/runtime-core/CHANGELOG.md` (none exists) documenting:
  - the agent-handler refactor + the extracted/exported helpers: `executeAgentBlock`, `serializeNotebookContext`, `serializeNotebookContextFromBlocks`, `createBlocksWithAttachedOutputsFromCollectedOutputs`, `resolveEnvVars`, `mergeMcpConfigs`, `buildSystemPrompt`
  - the new `selectPythonSpec` / `isBareSystemPython` exports from step 2A.
- **Does NOT publish to npm.** npm publish is maintainer-only and EXTERNAL / out-of-scope for this sprint — state explicitly and do not attempt it.
- **Fork discipline:** code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits.
- **Test runner:** vitest (`pnpm test`), not pytest.

---

## Deferred Work Review

First, identify what was deferred or left incomplete during the main feature work.

- [x] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [x] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [x] Reviewed code for new TODO/FIXME markers (grep for them).
- [x] Checked team chat/standup notes for deferred items.

| Cleanup Category  | Specific Item / Location                                                                                                                                                                                                                                                                                       | Priority | Justification for Cleanup                                                                                                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Documentation** | `packages/runtime-core/CHANGELOG.md` does not exist — create it                                                                                                                                                                                                                                                |    P1    | Downstream consumers can't see what changed in the agent-handler refactor or the new exports without a CHANGELOG.                                |
| **Dependencies**  | `packages/runtime-core/package.json` version still at `0.3.0`                                                                                                                                                                                                                                                  |    P1    | The agent helper exports + `selectPythonSpec`/`isBareSystemPython` are new public surface; consumers need a version past `0.3.0` to pin against. |
| **Documentation** | CHANGELOG must list the extracted helpers (`executeAgentBlock`, `serializeNotebookContext`, `serializeNotebookContextFromBlocks`, `createBlocksWithAttachedOutputsFromCollectedOutputs`, `resolveEnvVars`, `mergeMcpConfigs`, `buildSystemPrompt`) and the new `selectPythonSpec`/`isBareSystemPython` exports |    P1    | These are the consumable surface this sprint produced; the CHANGELOG is the record of them.                                                      |
| **Dependencies**  | npm publish of runtime-core                                                                                                                                                                                                                                                                                    |   OUT    | EXPLICITLY OUT OF SCOPE — maintainer-only secrets (`NPM_TOKEN`), external. Do NOT publish. Recorded here so it is not silently attempted.        |

---

## Cleanup Checklist

### Documentation Updates (optional)

| Task                    | Status / Details                                                                                                                                                                                   | Done? |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---: |
| **README.md**           | N/A — no README change required for this bump                                                                                                                                                      | - [x] |
| **API Documentation**   | CHANGELOG enumerates the new public exports                                                                                                                                                        | - [x] |
| **Architecture Docs**   | N/A                                                                                                                                                                                                | - [x] |
| **Runbooks/Playbooks**  | N/A                                                                                                                                                                                                | - [x] |
| **CHANGELOG**           | Create `packages/runtime-core/CHANGELOG.md` (Keep a Changelog format) documenting the agent-handler refactor, the seven extracted helpers, and the `selectPythonSpec`/`isBareSystemPython` exports | - [x] |
| **ADRs**                | N/A (ADR-001 already authored; not edited here — fork discipline keeps docs/adr out of code commits)                                                                                               | - [x] |
| **Inline Comments**     | N/A                                                                                                                                                                                                | - [x] |
| **Docstrings**          | N/A                                                                                                                                                                                                | - [x] |
| **Other: version bump** | Bump `@deepnote/runtime-core` past `0.3.0` in `packages/runtime-core/package.json`                                                                                                                 | - [x] |

### Testing & Quality (optional)

| Task                          | Status / Details                                              | Done? |
| :---------------------------- | :------------------------------------------------------------ | :---: |
| **Missing Unit Tests**        | N/A — coverage lands in step 2B (`1yecdf`)                    | - [x] |
| **Missing Integration Tests** | N/A                                                           | - [x] |
| **Test Coverage**             | N/A                                                           | - [x] |
| **Flaky Tests**               | N/A                                                           | - [x] |
| **Test Data/Fixtures**        | N/A                                                           | - [x] |
| **Performance Tests**         | N/A                                                           | - [x] |
| **Other: regression**         | `pnpm test` + `pnpm typecheck` still green after version bump | - [x] |

### Code Quality & Technical (optional)

| Task                      | Status / Details           | Done? |
| :------------------------ | :------------------------- | :---: |
| **TODOs Resolved**        | N/A                        | - [x] |
| **FIXMEs Addressed**      | N/A                        | - [x] |
| **Dead Code Removed**     | N/A                        | - [x] |
| **Duplicate Code**        | N/A                        | - [x] |
| **Magic Numbers/Strings** | N/A                        | - [x] |
| **Error Handling**        | N/A                        | - [x] |
| **Code Formatting**       | `pnpm lintAndFormat` clean | - [x] |
| **Linter Warnings**       | No new warnings            | - [x] |
| **Other:** [Custom]       | N/A                        | - [x] |

### Dependencies & (optional)

| Task                    | Status / Details                                                                                    | Done? |
| :---------------------- | :-------------------------------------------------------------------------------------------------- | :---: |
| **Dependency Updates**  | N/A                                                                                                 | - [x] |
| **Vulnerability Fixes** | N/A                                                                                                 | - [x] |
| **Lockfile Updates**    | Regenerate lockfile if the version bump requires it                                                 | - [x] |
| **Deprecated APIs**     | N/A                                                                                                 | - [x] |
| **License Compliance**  | N/A                                                                                                 | - [x] |
| **Other: version**      | `@deepnote/runtime-core` version moved past `0.3.0`; npm publish explicitly NOT done (out of scope) | - [x] |

### Configuration & Environment (optional)

| Task                      | Status / Details | Done? |
| :------------------------ | :--------------- | :---: |
| **Hardcoded Secrets**     | N/A              | - [x] |
| **Config Consistency**    | N/A              | - [x] |
| **Environment Variables** | N/A              | - [x] |
| **Default Values**        | N/A              | - [x] |
| **Other:** [Custom]       | N/A              | - [x] |

### Build & CI/CD (optional)

| Task                  | Status / Details                                                    | Done? |
| :-------------------- | :------------------------------------------------------------------ | :---: |
| **CI Pipeline**       | `pnpm test` green in CI after bump                                  | - [x] |
| **Build Scripts**     | N/A                                                                 | - [x] |
| **Docker/Containers** | N/A                                                                 | - [x] |
| **Pre-commit Hooks**  | N/A                                                                 | - [x] |
| **Other: publish**    | npm publish intentionally NOT performed (maintainer-only, external) | - [x] |

### Refactoring & Code Organization (optional)

| Task                      | Status / Details                              | Done? |
| :------------------------ | :-------------------------------------------- | :---: |
| **File/Module Splitting** | N/A                                           | - [x] |
| **Naming Improvements**   | N/A                                           | - [x] |
| **Function Extraction**   | N/A — helpers already extracted in prior work | - [x] |
| **Import Cleanup**        | N/A                                           | - [x] |
| **Other:** [Custom]       | N/A                                           | - [x] |

---

## Validation & Closeout

### Pre-Completion Verification

| Verification Task                     | Status / Evidence                                         |
| :------------------------------------ | :-------------------------------------------------------- |
| **All P0 Items Complete**             | No P0 items in this card                                  |
| **All P1 Items Complete or Ticketed** | version bump + CHANGELOG done                             |
| **Tests Passing**                     | `pnpm test` + `pnpm typecheck` green                      |
| **No New Warnings**                   | `pnpm lintAndFormat` clean                                |
| **Documentation Updated**             | `packages/runtime-core/CHANGELOG.md` created and reviewed |
| **Code Review**                       | gitban reviewer approved                                  |

### Follow-up & Lessons Learned

| Topic                      | Status / Action Required                                                  |
| :------------------------- | :------------------------------------------------------------------------ |
| **Remaining P2 Items**     | None                                                                      |
| **Recurring Issues**       | runtime-core lacked a CHANGELOG until now                                 |
| **Process Improvements**   | Keep CHANGELOG current per release going forward                          |
| **Technical Debt Tickets** | npm publish remains an external/maintainer follow-up (out of this sprint) |

### Completion Checklist

<!-- gate0: upper-checklist -->

- [x] All P0 items are complete and verified.
- [x] All P1 items are complete or have follow-up tickets created.
- [x] P2 items are complete or explicitly deferred with tickets.
- [x] All tests are passing (unit, integration, and regression).
- [x] No new linter warnings or errors introduced.
- [x] All documentation updates are complete and reviewed.
- [x] Code changes (if any) are reviewed and merged.
- [x] Follow-up tickets are created and prioritized for next sprint.
- [x] Team retrospective includes discussion of cleanup backlog (if significant).

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.

## Close-out (executor, cycle 1)

**Status:** Work complete, regression green, committed. Left in `in_progress` for the reviewer (no inbox directive to `complete_card`).

**Commit:** `ed13053` on `worktree-agent-a31c9fdb45049be55` — code-only, 2 files / +67/-1. No `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files staged (fork discipline respected).

### What shipped

- **Version bump:** `packages/runtime-core/package.json` `0.3.0` → **`0.4.0`**. Minor (additive) bump: this release surfaces new public exports and changes no existing exported signature. Lockfile (`pnpm-lock.yaml`) needs **no** regen — runtime-core is referenced as `link:../runtime-core` (workspace link), not a pinned version, and `git status` shows it unchanged.
- **CHANGELOG:** created `packages/runtime-core/CHANGELOG.md` (first CHANGELOG in the repo — none existed in any package or at root), Keep a Changelog + SemVer format. A `[0.4.0]` entry documents the agent-handler refactor and enumerates the new exports.

### Honest accuracy note on the seven helpers

The card lists seven extracted helpers. Verification of `index.ts` (the package entry point) shows they are NOT a uniform public surface — I documented them honestly rather than presenting all seven as public API:

- **Public (re-exported from `@deepnote/runtime-core` via `src/index.ts`):** `executeAgentBlock`, `serializeNotebookContext`, `serializeNotebookContextFromBlocks`, `createBlocksWithAttachedOutputsFromCollectedOutputs` (entered the entry point in PR #342, `dab053f`), plus `selectPythonSpec` / `isBareSystemPython` (step 2A, `c723e41`).
- **Internal module-level exports only (NOT re-exported from `index.ts`):** `resolveEnvVars`, `mergeMcpConfigs`, `buildSystemPrompt`. These are `export`ed from `src/agent-handler.ts` for in-package use / unit testing but are not part of the public package API. The CHANGELOG documents them under a separate "Internal (not part of the public package entry)" subsection and notes they may change without a major bump.

If the sprint intent was for all seven to be public API, that would be a code change to `index.ts` (out of scope for this docs/version card) and should be a follow-up — flagging for reviewer judgement rather than silently re-exporting.

### npm publish

Explicitly NOT performed — maintainer-only (`NPM_TOKEN`), external/out-of-scope. Recorded in the CHANGELOG "Notes" and on this card so it is not silently attempted.

### Verification (what actually ran)

- **Typecheck:** `pnpm --filter @deepnote/runtime-core exec tsc --noEmit` → exit 0.
- **Tests:** `pnpm --filter @deepnote/runtime-core exec vitest run` → **141 passed** across 6 suites. The 7th suite, `execution-engine.test.ts`, FAILS under the package-scoped filter with `ENOENT examples/1_hello_world.deepnote` — a CWD/fixture-path artifact: that suite reads `examples/<file>` relative to CWD, and those fixtures live at the **repo root** `examples/`, not under the package. Re-run the canonical way (`pnpm exec vitest run packages/runtime-core/src/execution-engine.test.ts` from the repo root, which is how the root `pnpm test` resolves) → **82 passed**. Total runtime-core: **223 tests green** when run as CI runs them. The failure is unrelated to this change (a version bump + new markdown file cannot affect a fixture path) and pre-exists.
- **Lint/format:** `biome check` (package.json + CHANGELOG) exit 0; `prettier --check` on CHANGELOG → clean; `cspell --no-gitignore` on CHANGELOG → 0 issues (reworded one jargon term "fixtured" → "fixture" to satisfy the dictionary; note cspell sees 0 files in-worktree due to `useGitignore:true` excluding untracked paths — confirmed clean with `--no-gitignore`).
- **TODO/FIXME sweep:** none in changed files or in `packages/runtime-core/src`.
- **package.json sort:** `sort-package-json --check` → already sorted.

No work deferred; no follow-up cards created. The single open Completion-Checklist box ("Code changes reviewed and merged") is the reviewer's gate, intentionally left for cycle close-out.

## Review log (router, cycle 1)

- **Verdict:** APPROVAL (commit `ed13053`)
- **Review report:** `.gitban/agents/reviewer/inbox/S6INREPO-sjwaox-reviewer-1.md`
- **Gate 1 (completion claim):** PASS — documentation/config-bump exempt category; checkboxes concrete and verifiable.
- **Gate 2 (implementation quality):** PASS — version bump to `0.4.0` verified, public-vs-internal helper split documented accurately, CHANGELOG references resolve to real artifacts, no lazy solves/secrets/IaC gaps.
- **Blockers:** None.
- **Non-blocking follow-up:** None. The public-vs-internal helper discrepancy the executor surfaced is pre-existing package shape, now accurately documented — not a defect and not adjacent debt worsened by this diff.
- **Routing:** Executor instructed to close out the card. No planner routing required (no follow-up items). Instructions at `.gitban/agents/executor/inbox/S6INREPO-sjwaox-executor-1.md`.
