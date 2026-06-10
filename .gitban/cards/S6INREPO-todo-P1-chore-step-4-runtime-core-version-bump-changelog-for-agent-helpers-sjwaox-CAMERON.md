# Sprint Cleanup Template

## Cleanup Scope & Context

- **Sprint/Release:** S6INREPO (m1/s6 in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md` Phase 2. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Primary Feature Work:** runtime agent-block executor refactor + extracted/exported helpers (Stream B), plus the new `selectPythonSpec`/`isBareSystemPython` exports from step 2A (Stream A). **Depends on step 2B (card `1yecdf`)** — the agent helper coverage must land before the release is described.
- **Cleanup Category:** Mixed (version bump + CHANGELOG documentation for `@deepnote/runtime-core`)

**Required Checks:**

- [ ] Sprint/Release is identified above.
- [ ] Primary feature work that generated this cleanup is documented.

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

- [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [ ] Reviewed code for new TODO/FIXME markers (grep for them).
- [ ] Checked team chat/standup notes for deferred items.

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
| **README.md**           | N/A — no README change required for this bump                                                                                                                                                      | - [ ] |
| **API Documentation**   | CHANGELOG enumerates the new public exports                                                                                                                                                        | - [ ] |
| **Architecture Docs**   | N/A                                                                                                                                                                                                | - [ ] |
| **Runbooks/Playbooks**  | N/A                                                                                                                                                                                                | - [ ] |
| **CHANGELOG**           | Create `packages/runtime-core/CHANGELOG.md` (Keep a Changelog format) documenting the agent-handler refactor, the seven extracted helpers, and the `selectPythonSpec`/`isBareSystemPython` exports | - [ ] |
| **ADRs**                | N/A (ADR-001 already authored; not edited here — fork discipline keeps docs/adr out of code commits)                                                                                               | - [ ] |
| **Inline Comments**     | N/A                                                                                                                                                                                                | - [ ] |
| **Docstrings**          | N/A                                                                                                                                                                                                | - [ ] |
| **Other: version bump** | Bump `@deepnote/runtime-core` past `0.3.0` in `packages/runtime-core/package.json`                                                                                                                 | - [ ] |

### Testing & Quality (optional)

| Task                          | Status / Details                                              | Done? |
| :---------------------------- | :------------------------------------------------------------ | :---: |
| **Missing Unit Tests**        | N/A — coverage lands in step 2B (`1yecdf`)                    | - [ ] |
| **Missing Integration Tests** | N/A                                                           | - [ ] |
| **Test Coverage**             | N/A                                                           | - [ ] |
| **Flaky Tests**               | N/A                                                           | - [ ] |
| **Test Data/Fixtures**        | N/A                                                           | - [ ] |
| **Performance Tests**         | N/A                                                           | - [ ] |
| **Other: regression**         | `pnpm test` + `pnpm typecheck` still green after version bump | - [ ] |

### Code Quality & Technical (optional)

| Task                      | Status / Details           | Done? |
| :------------------------ | :------------------------- | :---: |
| **TODOs Resolved**        | N/A                        | - [ ] |
| **FIXMEs Addressed**      | N/A                        | - [ ] |
| **Dead Code Removed**     | N/A                        | - [ ] |
| **Duplicate Code**        | N/A                        | - [ ] |
| **Magic Numbers/Strings** | N/A                        | - [ ] |
| **Error Handling**        | N/A                        | - [ ] |
| **Code Formatting**       | `pnpm lintAndFormat` clean | - [ ] |
| **Linter Warnings**       | No new warnings            | - [ ] |
| **Other:** [Custom]       | N/A                        | - [ ] |

### Dependencies & (optional)

| Task                    | Status / Details                                                                                    | Done? |
| :---------------------- | :-------------------------------------------------------------------------------------------------- | :---: |
| **Dependency Updates**  | N/A                                                                                                 | - [ ] |
| **Vulnerability Fixes** | N/A                                                                                                 | - [ ] |
| **Lockfile Updates**    | Regenerate lockfile if the version bump requires it                                                 | - [ ] |
| **Deprecated APIs**     | N/A                                                                                                 | - [ ] |
| **License Compliance**  | N/A                                                                                                 | - [ ] |
| **Other: version**      | `@deepnote/runtime-core` version moved past `0.3.0`; npm publish explicitly NOT done (out of scope) | - [ ] |

### Configuration & Environment (optional)

| Task                      | Status / Details | Done? |
| :------------------------ | :--------------- | :---: |
| **Hardcoded Secrets**     | N/A              | - [ ] |
| **Config Consistency**    | N/A              | - [ ] |
| **Environment Variables** | N/A              | - [ ] |
| **Default Values**        | N/A              | - [ ] |
| **Other:** [Custom]       | N/A              | - [ ] |

### Build & CI/CD (optional)

| Task                  | Status / Details                                                    | Done? |
| :-------------------- | :------------------------------------------------------------------ | :---: |
| **CI Pipeline**       | `pnpm test` green in CI after bump                                  | - [ ] |
| **Build Scripts**     | N/A                                                                 | - [ ] |
| **Docker/Containers** | N/A                                                                 | - [ ] |
| **Pre-commit Hooks**  | N/A                                                                 | - [ ] |
| **Other: publish**    | npm publish intentionally NOT performed (maintainer-only, external) | - [ ] |

### Refactoring & Code Organization (optional)

| Task                      | Status / Details                              | Done? |
| :------------------------ | :-------------------------------------------- | :---: |
| **File/Module Splitting** | N/A                                           | - [ ] |
| **Naming Improvements**   | N/A                                           | - [ ] |
| **Function Extraction**   | N/A — helpers already extracted in prior work | - [ ] |
| **Import Cleanup**        | N/A                                           | - [ ] |
| **Other:** [Custom]       | N/A                                           | - [ ] |

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

- [ ] All P0 items are complete and verified.
- [ ] All P1 items are complete or have follow-up tickets created.
- [ ] P2 items are complete or explicitly deferred with tickets.
- [ ] All tests are passing (unit, integration, and regression).
- [ ] No new linter warnings or errors introduced.
- [ ] All documentation updates are complete and reviewed.
- [ ] Code changes (if any) are reviewed and merged.
- [ ] Follow-up tickets are created and prioritized for next sprint.
- [ ] Team retrospective includes discussion of cleanup backlog (if significant).

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
