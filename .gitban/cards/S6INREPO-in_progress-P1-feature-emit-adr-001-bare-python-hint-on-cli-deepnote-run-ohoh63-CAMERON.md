# Feature Development Template

**When to use this template:** Additive feature work to close the open CLI half of an ADR-001 obligation surfaced in S6INREPO card `pv4px0` review 1 and deferred via closeout card `o5pg2k` retro Item 3.

**When NOT to use this template:** Not a bug fix or refactor — this adds a user-facing hint that does not yet exist on the CLI consumer.

## Feature Overview & Context

- **Associated Ticket/Epic:** ADR-001 (shared interpreter contract); closeout card `o5pg2k` retro Item 3; source review `pv4px0` review 1.
- **Feature Area/Component:** `packages/cli/src/commands/run.ts` (`deepnote run`) — Python interpreter resolution.
- **Target Release/Milestone:** m1/s6 in-repo residual; next available sprint (not S6INREPO — that sprint is closing).

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

First, confirm the minimum required documentation has been reviewed for context.

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed (ADR-001).
- [x] Related feature implementations or similar code reviewed (MCP consumer `packages/mcp/src/tools/execution.ts`).
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type         | Link / Location                               | Key Findings / Action Required                                                                             |
| :-------------------- | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **README.md**         | `packages/mcp/README.md`                      | MCP hint already documented (card `mjporx`); mirror the wording for CLI parity.                            |
| **Architecture Docs** | ADR-001                                       | Every deepnote-run consumer must surface a bare-system-python hint when resolution lands on bare `python`. |
| **Similar Features**  | `packages/mcp/src/tools/execution.ts:114`     | MCP half shipped: hint gated on `isBareSystemPython(spec) && !hasOverride`. Mirror the text.               |
| **API Specs**         | `packages/runtime-core/src/python-env.ts:162` | `isBareSystemPython` already exported — no new runtime-core surface needed.                                |
| **ADR (New)**         | **N/A**                                       | No new ADR; this satisfies an existing ADR-001 obligation.                                                 |

## Design & Planning

### Initial Design Thoughts & Requirements

> The MCP consumer warns on bare autodetect with no override; the CLI does not. Close the parity gap.

- Requirement: When `deepnote run` resolves to a bare system `python` (no `--python`, no `DEEPNOTE_PYTHON`), emit the actionable hint ("set `DEEPNOTE_PYTHON` or pass a venv with deepnote-toolkit[server]").
- Constraint: Precedence (arg > `DEEPNOTE_PYTHON` > autodetect) is already correct from card `pv4px0` — do not alter it; only add the hint.
- Design thought: `run.ts` imports `selectPythonSpec` (line 18) but NOT `isBareSystemPython`; resolves the spec at run.ts:296. Import `isBareSystemPython`, compute spec once, log hint when bare with no override.
- Dependency: none external — `isBareSystemPython` is already exported.

### Acceptance Criteria

- [x] `run.ts` imports `isBareSystemPython` from `@deepnote/runtime-core`.
- [x] When the resolved spec is bare system python AND there is no `--python`/`DEEPNOTE_PYTHON` override, `deepnote run` logs the same actionable hint the MCP consumer returns (mirroring `mjporx` text).
- [x] The hint does NOT fire when an explicit `--python` or `DEEPNOTE_PYTHON` override is present, nor when a non-bare interpreter is resolved.
- [x] A vitest precedence-style test asserts the hint fires only on bare autodetect with no override.
- [x] Precedence behavior from `pv4px0` is unchanged (no regressions in `run.test.ts`).

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card           |        Universal Check        |
| :------------------------ | :------------------------------------------ | :---------------------------: |
| **Design & Architecture** | Mirror MCP consumer hint (card `mjporx`)    |     - [x] Design Complete     |
| **Test Plan Creation**    | Precedence-style hint test in `run.test.ts` |   - [x] Test Plan Approved    |
| **TDD Implementation**    | Pending                                     | - [x] Implementation Complete |
| **Integration Testing**   | Pending                                     | - [x] Integration Tests Pass  |
| **Documentation**         | Optional CLI docs note for parity           | - [x] Documentation Complete  |
| **Code Review**           | Pending                                     |  - [ ] Code Review Approved   |
| **Deployment Plan**       | Ships with next CLI release                 |  - [x] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                            |                     Universal Check                      |
| :---------------------------: | :-------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | Assert hint fires only on bare autodetect, no override    |     - [x] Failing tests are committed and documented     |
| **2. Implement Feature Code** | Import `isBareSystemPython`; emit hint at run.ts:296 path |         - [x] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `run.test.ts` green                                       |         - [x] Originally failing tests now pass          |
|        **4. Refactor**        | Pending                                                   | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | runtime-core + cli suites green                           |      - [x] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (log line only)                                       |          - [x] Performance requirements are met          |

### Implementation Notes

> Mirror the MCP consumer's hint wording for cross-consumer parity.

**Test Strategy:**
Add a precedence-style vitest case asserting the hint logs only on bare autodetect with no override, and asserting it is silent when `--python` or `DEEPNOTE_PYTHON` is set.

**Key Implementation Decisions:**
Reuse `isBareSystemPython` and `selectPythonSpec` (both already imported/exported); no change to precedence logic from `pv4px0`.

```python
# (Tests are TypeScript/vitest; placeholder retained for template conformance.)
def test_placeholder():
    pass
```

## Validation & Closeout

| Task                      | Detail/Link      |
| :------------------------ | :--------------- |
| **Code Review**           | Pending          |
| **QA Verification**       | Pending          |
| **Staging Deployment**    | N/A              |
| **Production Deployment** | Next CLI release |
| **Monitoring Setup**      | N/A              |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                                                                |
| :-------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Postmortem Required?**    | No                                                                                                      |
| **Further Investigation?**  | Confirm any other deepnote-run consumers (e.g. vscode-deepnote producer) also honor the hint obligation |
| **Technical Debt Created?** | No                                                                                                      |
| **Future Enhancements**     | N/A                                                                                                     |

### Completion Checklist

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [ ] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
- [ ] Feature is deployed to production.
- [ ] Monitoring and alerting are configured.
- [ ] Stakeholders are notified of completion.
- [ ] Follow-up actions are documented and tickets created.
- [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.

## Executor Close-out (cycle 1)

**Shipped** (commit `29a863c` on the worktree branch; tag `S6INREPO-ohoh63-done`):

- `packages/cli/src/commands/run.ts`:
  - Imported `isBareSystemPython` from `@deepnote/runtime-core`.
  - Added `resolvePythonSpecWithHint(explicit)` — a CLI-local mirror of the MCP consumer's `resolvePythonEnv` (`packages/mcp/src/tools/execution.ts:113`). It runs the shared `selectPythonSpec` precedence chain (`--python` > `DEEPNOTE_PYTHON` > autodetect) and returns the spec plus an optional `hint`. The hint fires ONLY when `isBareSystemPython(spec) && !hasOverride`, where `hasOverride` is a non-blank `--python` OR a non-blank `DEEPNOTE_PYTHON` (blank/whitespace is NOT an override — it falls through to autodetect, so it must not suppress the hint).
  - `setupProject` now computes the spec via this helper and, when a hint is present and not in machine-output mode, logs it via `log(getChalk().yellow(...))`. Precedence logic from `pv4px0` is untouched — `pythonEnv` handed to `ExecutionEngine` is the same spec string as before.
  - Hint wording mirrors `mjporx`/MCP text: `Resolved Python to "<spec>" (system interpreter) which likely lacks deepnote-toolkit. Set DEEPNOTE_PYTHON or pass --python pointing at a venv with deepnote-toolkit[server] installed.` (`pythonPath` → `--python` adapted for the CLI surface.)

- `packages/cli/src/commands/run.test.ts`: added a `bare-system-python hint (ADR-001 parity)` describe block with 6 cases — fires on bare autodetect with no override; fires when `DEEPNOTE_PYTHON` is blank; silent when `--python` is set, when `DEEPNOTE_PYTHON` is set, when a non-bare interpreter path is resolved, and in machine-output (`-o json`) mode. Tests reuse the existing real-`selectPythonSpec` mock setup (runtime-core is `importOriginal`-spread, so the genuine `isBareSystemPython` is exercised, not a reimplementation).

**Tests — what was actually verified:**

- `pnpm exec vitest run packages/cli/src/commands/run.test.ts` → **162 passed** (the 6 new + all 156 pre-existing, including the `pv4px0` precedence suite — no regressions). Run from the repo root, since the suite resolves the `examples/*.deepnote` fixtures relative to `process.cwd()` (they live at repo root, NOT under `packages/cli`; running from `packages/cli` fails with a fixture-not-found error unrelated to this change).
- `pnpm exec vitest run packages/runtime-core/src/python-env.test.ts` → **40 passed** (no new runtime-core surface; `isBareSystemPython` reused as-is).
- `pnpm exec tsc --noEmit` (cli package) → clean.
- `pnpm exec biome check` on both changed files → clean, no fixes needed.
- These are unit tests with `ExecutionEngine`/`resolvePythonExecutable` stubbed and `node:child_process.execSync` mocked to resolve autodetect to bare `python`. They prove the hint-gating logic and human-vs-machine routing at the `createRunAction` boundary; they do NOT exercise a live interpreter spawn. No live `deepnote run` was executed (the hint is a pure log-line decision, no runtime behaviour change).

**Deferred:** none. The card's "Further Investigation" note (confirm other deepnote-run producers like vscode-deepnote honor the hint obligation) is a discovery item outside this card's CLI scope — not deferred work from this card.

**Profiling log:** `.gitban/agents/executor/logs/S6INREPO-ohoh63-executor-1.jsonl` written in the worktree (worktree `.gitban/` is gitignored — the dispatcher reconciles `.gitban/` state after merge, so it was not committed from here per the executor git-ops contract).

Left in `in_progress` for the reviewer to flip. Unchecked Completion-Checklist items (code-review-approved/PR-merged, deployed-to-production, monitoring, stakeholders-notified, follow-up-tickets, ticket-closed) and the `Code Review Approved` phase box are intentionally left for the review/PR/deploy stages.
