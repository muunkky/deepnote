## Refactoring Overview & Motivation

- **Refactoring Target:** the bare-system-python hint resolution, duplicated across the two deepnote-run consumers
- **Code Location:** `packages/cli/src/commands/run.ts` (`resolvePythonSpecWithHint`, ~line 257) and `packages/mcp/src/tools/execution.ts` (`resolvePythonEnv`, ~line 113)
- **Refactoring Type:** Extract shared helper into `@deepnote/runtime-core`
- **Motivation:** the two functions are byte-near-identical (same `isRealOverride` non-blank helper, same `isBareSystemPython(spec) && !hasOverride` gate, same hint string) — only the caller-surface noun differs (`--python` vs `pythonPath`). ADR-001 centralized the _selector_ (`selectPythonSpec`) and the _bare-check_ (`isBareSystemPython`) in runtime-core so CLI/MCP can't diverge, but the _hint layer_ was left duplicated.
- **Business Impact:** closes the exact drift class ADR-001 targets. The empty-string remediation (card 3oz7aa) already paid the cost — it had to tighten `hasOverride` to a non-blank check in BOTH copies in lockstep. Found by code-review on PR #2 (inline r3392502127).
- **Scope:** ~2 small functions (~12 lines each) + 1 new runtime-core export + its unit tests. Bounded.
- **Risk Level:** Low — behavior-preserving extraction; both consumers already go through the engine; strong existing test coverage on both sides.
- **Related Work:** ADR-001 (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`); cards onwhhg (selectPythonSpec), mjporx (MCP hint), ohoh63 (CLI hint), 3oz7aa (empty-string remediation). Lands on PR muunkky/deepnote#2 branch `feat/shared-python-interpreter-resolution` (cherry-picked after).

**Required Checks:**

- [x] **Refactoring motivation** clearly explains why this change is needed.
- [x] **Scope** is specific and bounded (not open-ended "improve everything").
- [x] **Risk level** is assessed based on code criticality and usage.

## Definition of Done

### Intent

Today the "your interpreter is a bare system python and probably lacks deepnote-toolkit" warning is implemented twice — once in the CLI, once in the MCP server — as copy-pasted logic that only differs in one word of the message. A maintainer changing the override semantics or the wording has to remember to edit both, and the last person who touched it (the empty-string fix) had to. After this card there is ONE implementation of that decision in `@deepnote/runtime-core`, and both consumers call it; the only per-consumer input is the surface noun shown in the hint. Someone debugging interpreter resolution sees identical behavior from `deepnote run` and `deepnote_run` because it is literally the same code. If this regresses, a CLI/MCP behavior divergence in the hint (or a stale duplicate) would reappear.

### Observable outcomes

- [x] A new helper exported from `@deepnote/runtime-core` (e.g. `selectPythonSpecWithHint({ explicit, argLabel })`) returns `{ spec: string; hint?: string }`, computing the spec via `selectPythonSpec` and attaching the hint only when `isBareSystemPython(spec)` AND no real (non-blank) override (`explicit` or `DEEPNOTE_PYTHON`) is present; the hint message embeds `argLabel` for the caller-surface noun.
- [x] Exported from `packages/runtime-core/src/index.ts`.
- [x] `cli/run.ts` `resolvePythonSpecWithHint` and `mcp/execution.ts` `resolvePythonEnv` are DELETED and replaced by calls to the shared helper (passing `argLabel: '--python'` and `argLabel: 'pythonPath'` respectively); the duplicated inline `isRealOverride` is gone from both.
- [x] CLI machine-output mode still suppresses the printed hint (the `!isMachineOutput` gate stays in `run.ts`; only the resolution moves).
- [x] **Capstone (behavior-preserving):** with bare autodetect and no override, BOTH consumers still surface the hint via the single shared helper — proven by (a) new runtime-core unit tests for the helper (bare+no-override → hint fires; explicit arg / `DEEPNOTE_PYTHON` set / blank values → no hint or fall-through as today), and (b) the EXISTING `packages/cli/src/commands/run.test.ts` and `packages/mcp/src/tools/execution.python-env.test.ts` suites passing UNCHANGED (same observable behavior, including the blank-not-an-override and override-suppresses-hint cases).
- [x] `@deepnote/runtime-core` version bumped (adds a public export) + CHANGELOG entry.

## Pre-Refactoring Context Review

- [x] Existing code reviewed and behavior fully understood.
- [x] Test coverage reviewed - current test suite provides safety net.
- [x] Documentation reviewed (README, docstrings, inline comments).
- [x] Style guide and coding standards reviewed for compliance.
- [x] Dependencies reviewed (internal modules, external libraries).
- [x] Usage patterns reviewed (who calls this code, how it's used).
- [x] Previous refactoring attempts reviewed (if any - learn from history).

| Review Source         | Link / Location                                                                          | Key Findings / Constraints                                                        |
| :-------------------- | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Existing Code**     | `cli/run.ts:257`, `mcp/execution.ts:113`                                                 | Two near-identical `{spec, hint?}` resolvers; only the hint noun differs          |
| **Test Coverage**     | `cli/run.test.ts`, `mcp/execution.python-env.test.ts`, `runtime-core/python-env.test.ts` | Both consumers have override-matrix + blank-handling tests that must keep passing |
| **Documentation**     | ADR-001; mcp/README + cli/README interpreter sections                                    | Hint wording documented; keep messages equivalent                                 |
| **Dependencies**      | both consumers depend on `@deepnote/runtime-core`                                        | The shared home already exists (`selectPythonSpec`, `isBareSystemPython`)         |
| **Usage Patterns**    | `setupProject` (CLI) ; `handleRun`/`handleRunBlock` (MCP)                                | hint surfaced at the consumer boundary per ADR-001                                |
| **Previous Attempts** | 3oz7aa                                                                                   | Already had to edit both copies in lockstep — the drift cost this card removes    |

## Refactoring Strategy & Risk Assessment

**Refactoring Approach:** Extract Method to a shared module — move the gate + hint construction into runtime-core, parameterize the surface noun via `argLabel`. The consumers become thin call sites.

**Incremental Steps:**

1. Add failing unit tests for the new runtime-core helper (override matrix + blank cases).
2. Implement `selectPythonSpecWithHint` in `python-env.ts`; export from `index.ts`.
3. Refactor `mcp/execution.ts` `resolvePythonEnv` to call it (argLabel `pythonPath`).
4. Refactor `cli/run.ts` `resolvePythonSpecWithHint` to call it (argLabel `--python`); keep the `!isMachineOutput` print gate.
5. Run both consumer suites unchanged; bump runtime-core + CHANGELOG.

**Risk Mitigation:** behavior-preserving — the existing consumer suites are the safety net and must pass without modification. Risk: hint wording drift between old/new → the new helper's message must match the current strings (modulo the `argLabel` noun).

**Rollback Plan:** pure code change on a feature branch; `git revert` the commit. No migration, no prod deploy.

**Success Criteria:** both consumer suites pass unchanged; new runtime-core unit tests pass; no remaining duplicated hint logic; tsc + biome clean.

## Refactoring Phases

| Phase / Task                | Status / Link to Artifact or Card                                |                                Universal Check                                |
| :-------------------------- | :--------------------------------------------------------------- | :---------------------------------------------------------------------------: |
| **Pre-Refactor Test Suite** | existing consumer suites + new runtime-core tests                |          - [x] Comprehensive tests exist before refactoring starts.           |
| **Baseline Measurements**   | runtime-core 234, cli run 162, mcp python-env 13 (current green) |     - [x] Baseline metrics captured (complexity, performance, coverage).      |
| **Incremental Refactoring** | extract → wire MCP → wire CLI                                    | - [x] Refactoring implemented incrementally with passing tests at each step.  |
| **Documentation Updates**   | JSDoc on the new helper; CHANGELOG                               |          - [x] All documentation updated to reflect refactored code.          |
| **Code Review**             | gitban reviewer                                                  | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation**  | N/A — pure structural change, no hot path                        |                                   - [x] N/A                                   |
| **Staging Deployment**      | N/A — in-repo fork PR, no deploy                                 |                                   - [x] N/A                                   |
| **Production Deployment**   | N/A — merge is the user's call; ships with next release          |                                   - [x] N/A                                   |

## Safe Refactoring Workflow

|               Step               | Status/Details                              |                            Universal Check                            |
| :------------------------------: | :------------------------------------------ | :-------------------------------------------------------------------: |
| **1. Establish Test Safety Net** | existing consumer suites + new helper tests |      - [x] Comprehensive tests exist covering current behavior.       |
|    **2. Run Baseline Tests**     | runtime-core/cli/mcp green                  |          - [x] All tests pass before any refactoring begins.          |
| **3. Capture Baseline Metrics**  | 234 / 162 / 13                              |            - [x] Baseline metrics captured for comparison.            |
|  **4. Make Smallest Refactor**   | add helper + tests                          |           - [x] Smallest possible refactoring change made.            |
|   **5. Run Tests (Iteration)**   | scoped vitest                               |            - [x] All tests pass after refactoring change.             |
| **6. Commit Incremental Change** | per-step commits                            |      - [x] Incremental change committed (enables easy rollback).      |
|     **7. Repeat Steps 4-6**      | wire MCP, then CLI                          | - [x] All incremental refactoring steps completed with passing tests. |
|   **8. Update Documentation**    | JSDoc + CHANGELOG                           |                   - [x] All documentation updated.                    |
|   **9. Style & Linting Check**   | tsc --noEmit + biome                        | - [x] Code passes linting, type checking, and style guide validation. |
|       **10. Code Review**        | gitban reviewer                             |      - [ ] Changes reviewed for correctness and maintainability.      |
|  **11. Performance Validation**  | N/A — structural                            |                               - [x] N/A                               |
|    **12. Deploy to Staging**     | N/A — fork PR                               |                               - [x] N/A                               |
|  **13. Production Deployment**   | N/A — user's merge call                     |                               - [x] N/A                               |

#### Refactoring Implementation Notes

**Refactoring Techniques Applied:** Extract Method to a shared module; parameterize the per-consumer surface noun (`argLabel`).

**Code Quality Improvements:** one source of truth for the bare-python hint decision; zero duplicated `isRealOverride`; CLI/MCP cannot diverge on hint behavior.

## Refactoring Validation & Completion

| Task                      | Detail/Link                                                                                   |
| :------------------------ | :-------------------------------------------------------------------------------------------- |
| **Code Location**         | `runtime-core/src/python-env.ts` (+ index.ts), `cli/run.ts`, `mcp/execution.ts` + their tests |
| **Test Suite**            | new runtime-core helper tests + existing consumer suites unchanged                            |
| **Style & Linting**       | tsc --noEmit + biome clean                                                                    |
| **Code Review**           | gitban reviewer                                                                               |
| **Documentation Updates** | helper JSDoc + runtime-core CHANGELOG                                                         |
| **Staging Validation**    | N/A — fork PR                                                                                 |
| **Production Deployment** | N/A — user's merge call                                                                       |

### Follow-up & Lessons Learned

| Topic                           | Status / Action Required                                        |
| :------------------------------ | :-------------------------------------------------------------- |
| **Further Refactoring Needed?** | No — this is the last duplicated interpreter-resolution surface |
| **Technical Debt Reduced?**     | Yes — removes the CLI/MCP hint duplication flagged on PR #2     |
| **Documentation Complete?**     | JSDoc + CHANGELOG                                               |

### Completion Checklist

- [x] Comprehensive tests exist before refactoring (helper unit tests + existing consumer suites).
- [x] All tests pass before refactoring begins (baseline established).
- [x] Baseline metrics captured (234 / 162 / 13).
- [x] Refactoring implemented incrementally (small, safe steps).
- [x] All tests pass after each refactoring step (continuous validation).
- [x] Documentation updated (JSDoc, CHANGELOG).
- [x] Code passes style guide validation (tsc, biome).
- [ ] Code reviewed (gitban reviewer).
- [x] No behavior change — both consumer suites pass UNCHANGED.
- [x] Staging validation N/A — in-repo fork PR.
- [x] Production deployment N/A — merge is the user's call.
- [x] Code quality improved (one source of truth; no duplicated hint logic).
- [x] Rollback plan documented (git revert; pure code change).

## Close-out (executor cycle 1)

**Shipped.** Extracted the duplicated bare-system-python hint into a single runtime-core export; both deepnote-run consumers now call it.

### Changes

- `packages/runtime-core/src/python-env.ts` — new `selectPythonSpecWithHint({ explicit, argLabel })` returning `{ spec, hint? }`. Computes the spec via `selectPythonSpec`; attaches the hint only when `isBareSystemPython(spec)` AND no real (non-blank) override (`explicit` or `DEEPNOTE_PYTHON`) — reusing the existing `firstNonBlank` helper for the non-blank check rather than re-introducing an inline `isRealOverride`. `argLabel` is embedded in the hint for the caller-surface noun.
- `packages/runtime-core/src/index.ts` — exports the new helper.
- `packages/mcp/src/tools/execution.ts` — `resolvePythonEnv` reduced to a one-line delegate (`argLabel: 'pythonPath'`); the inline `isRealOverride` + hint string are gone. Dropped now-unused `isBareSystemPython`/`selectPythonSpec` imports.
- `packages/cli/src/commands/run.ts` — local `resolvePythonSpecWithHint` DELETED; call site now uses `selectPythonSpecWithHint({ explicit: options.python, argLabel: '--python' })`. The `!isMachineOutput` print gate stays in `run.ts`. Dropped now-unused imports.
- `packages/runtime-core/package.json` — 0.4.0 → 0.5.0 (additive public export). CHANGELOG entry added.

### Hint-string note (behavior-preserving, one cosmetic wording change)

The unified message is `Resolved Python to "<spec>" (system interpreter) which likely lacks deepnote-toolkit. Set DEEPNOTE_PYTHON or pass <argLabel> pointing at a venv with deepnote-toolkit[server] installed.` This is byte-identical to the prior CLI string (`--python`) and changes only the MCP wording from "pass pythonPath **to** a venv" to "pass pythonPath **pointing at** a venv" — a cosmetic non-asserted fragment. All test assertions are on fragments (`system interpreter`, `DEEPNOTE_PYTHON`, `deepnote-toolkit`, `deepnote-toolkit[server]`, `--python`, `likely lacks deepnote-toolkit`), every one of which the unified message still satisfies; no consumer test was modified.

### What the tests actually proved

Run from the repo root (the canonical `vitest run` CWD; the CLI suite's `HELLO_WORLD_FILE` is resolved relative to CWD, so it MUST run from root — running it from `packages/cli` spuriously fails the file-resolution path, unrelated to this change):

- `packages/runtime-core/src/python-env.test.ts` — 49 passed (38 prior + 11 NEW `selectPythonSpecWithHint` tests: bare+no-override fires; argLabel embedded; explicit/env real override → no hint; non-bare spec → no hint; blank explicit/blank env/both-blank → fires; explicit bare env override → no hint).
- `packages/mcp/src/tools/execution.python-env.test.ts` — 13 passed, **UNCHANGED** (baseline 13).
- `packages/cli/src/commands/run.test.ts` — 162 passed, **UNCHANGED** (baseline 162).
- Total 224/224 green. These are real unit/integration runs against the actual code — not fixtures.

Quality gates: `pnpm typecheck` (root tsc + per-package) exit 0; `biome check` clean on all 5 changed files (one auto-format applied to the new helper's destructured signature, committed).

### Commits (worktree branch)

1. `feat(runtime-core): add selectPythonSpecWithHint shared bare-python hint helper`
2. `refactor(mcp): call shared selectPythonSpecWithHint for bare-python hint`
3. `refactor(cli): call shared selectPythonSpecWithHint; bump runtime-core 0.5.0`

No deferrals. Left in `in_progress` for the reviewer; the two `Code reviewed (gitban reviewer)` boxes are intentionally unticked for the reviewer to flip.
