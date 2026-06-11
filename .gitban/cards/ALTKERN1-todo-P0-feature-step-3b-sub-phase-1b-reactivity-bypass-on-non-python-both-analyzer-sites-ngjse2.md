# step 3B: Sub-phase 1B — reactivity bypass on non-Python (both analyzer sites)

> Maps to design-doc **Sub-phase 1B** (reactivity-bypass behavior; the second of the three user-visible behaviors split out of 1B per the packed-card rule). All mocked. Parallel with step 3A (no file collision — this card touches only `run.ts` analyzer functions; 3A touches `packages/blocks` + `execution-engine.ts`). Depends on: step 2 (1A — resolved `kernelName` threading, `DEFAULT_KERNEL_NAME`).
> Implements ADR-004 Decision point 2 (R5, KD-5).

## Feature Overview & Context

- **Associated Ticket/Epic:** PRD-002 Phase 1; roadmap `m2/s5/alternative-kernels/phase1-implementation`; ADR-004
- **Feature Area/Component:** `@deepnote/cli` (`run.ts` — the two Python-AST-analyzer call sites)
- **Target Release/Milestone:** ALTKERN1 sub-phase 1B (reactivity)

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type                        | Link / Location                                                                   | Key Findings / Action Required                                                                                                                                                                                                                                  |
| :----------------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design doc 1B**                    | `docs/designs/phase1-alternative-language-kernels.md` (Sub-phase 1B; KD-5)        | Binary DoD; the corrected premise — efficiency/honesty change, not a crash fix; BOTH analyzer sites bypass.                                                                                                                                                     |
| **ADR-004**                          | `docs/adr/ADR-004-non-python-degradation-behavior.md` (Decision pt 2)             | Reactivity is Python-only → skip the analyzer entirely; emit a "reactivity is Python-only" notice; ordered execution.                                                                                                                                           |
| **resolveUpstreamExecutionBlockIds** | `packages/cli/src/commands/run.ts:439-484`                                        | Signature `(file, options, pythonInterpreter)`; early-return `if (!options.block) return undefined` at `:444`; analyzer call `getUpstreamBlocks` at `:459`; existing fatal-branch ordered fallback at `:463-466`. Add `kernelName` param; bypass before `:459`. |
| **validateRequirements**             | `packages/cli/src/commands/run.ts:755-798`                                        | Signature `(file, providedInputs, pythonInterpreter, integrations, notebookName?)`; calls `getBlockDependencies` at `:793` inside try/catch returning on failure at `:794-798`. Add `kernelName` param; bypass before `:793`.                                   |
| **getUpstreamBlocks provenance**     | `@deepnote/reactivity` `packages/reactivity/src/dag.ts:116` (imported `run.ts:8`) | Already try/catches and returns `{status:'fatal'}` — so this is NOT a crash fix; the observable contract is "the analyzer is NOT invoked" + the notice.                                                                                                         |
| **DEFAULT_KERNEL_NAME**              | `packages/runtime-core/src/kernel-name.ts` (step 2)                               | Name-based check `kernelName !== DEFAULT_KERNEL_NAME` (these sites run pre-connect; `language` unavailable).                                                                                                                                                    |

## Design & Planning

### Initial Design Thoughts & Requirements

- Thread the resolved `kernelName: string` into both functions: `resolveUpstreamExecutionBlockIds(file, options, pythonInterpreter, kernelName)` and `validateRequirements(file, providedInputs, pythonInterpreter, integrations, notebookName?, kernelName)`. Update all call sites accordingly.
- In `resolveUpstreamExecutionBlockIds`: after the `if (!options.block) return undefined` early-return (`:444`) and **before** `getUpstreamBlocks` (`:459`): if `kernelName !== DEFAULT_KERNEL_NAME`, emit the "reactivity is Python-only; running without dependency analysis" notice and `return undefined` (reusing the existing fatal-branch ordered-execution fallback shape at `:463-466`) — so `getUpstreamBlocks` is never called.
- In `validateRequirements`: **before** `getBlockDependencies` (`:793`): if `kernelName !== DEFAULT_KERNEL_NAME`, emit the same notice and skip the call (existing try/catch remains as a safety net).
- The observable contract is **that the analyzer is not invoked** (and the notice is emitted), not "no `AstAnalyzerInternalError` reached the user" — the latter is already true today because both sites try/catch (KD-5).

### Acceptance Criteria

- [ ] Both functions take a `kernelName` parameter; all call sites updated.
- [ ] On a non-Python kernel via `--block`, `getUpstreamBlocks` is NOT called; blocks run in existing order; the notice is emitted.
- [ ] On a non-Python whole-notebook run, `getBlockDependencies` is NOT called; the notice is emitted; input validation is skipped.
- [ ] On `python3`, both analyzers are called exactly as today (regression).

## Definition of Done

### Intent

When a user runs a non-Python notebook on a path that would normally do Python-AST dependency analysis (`--block`, dag, analyze, lint, or whole-notebook input validation), the runtime does not waste a subprocess spawn on an analyzer it knows will fail on non-Python source — it skips the analyzer up front and tells the user plainly that reactivity is Python-only and blocks are running in order. On `python3` nothing changes. If this broke, a user on `bash`/R would see the runtime spawn (and log a swallowed failure from) `ast-analyzer.py` instead of an honest "reactivity is Python-only" notice — wasted latency and a misleading silent degrade.

### Observable outcomes

- [ ] `resolveUpstreamExecutionBlockIds` and `validateRequirements` accept `kernelName`; TypeScript compiles with all call sites passing the resolved kernel.
- [ ] With `getUpstreamBlocks` mocked, a `--block` invocation on a non-Python kernel does NOT call the mock and returns the ordered/single-block result.
- [ ] With `getBlockDependencies` mocked, a whole-notebook invocation on a non-Python kernel does NOT call the mock.
- [ ] A "reactivity is Python-only" notice is emitted on both non-Python paths.
- [ ] On `python3`, both mocks ARE called exactly as today (regression assertion).
- [ ] **Capstone (reactivity bypass):** given a non-Python kernel and a `--block` invocation whose target block has an upstream dependency, the mocked `getUpstreamBlocks` is **not called at all**, the runtime emits the "reactivity is Python-only" notice, and the requested block executes in existing order without dependency resolution — while the identical `--block` invocation on `python3` DOES call `getUpstreamBlocks` and resolves the upstream dependency as today.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card            |        Universal Check        |
| :------------------------ | :------------------------------------------- | :---------------------------: |
| **Design & Architecture** | ADR-004 + design doc KD-5                    |     - [ ] Design Complete     |
| **Test Plan Creation**    | `run.test.ts` analyzer-not-called assertions |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | thread `kernelName` + two bypass guards      | - [ ] Implementation Complete |
| **Integration Testing**   | N/A here (mocked); real kernel is step 5     | - [ ] Integration Tests Pass  |
| **Documentation**         | inline comments cite ADR-004 / KD-5          | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                              |  - [ ] Code Review Approved   |
| **Deployment Plan**       | additive; bypass never fires on `python3`    |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                                                                                   |                     Universal Check                      |
| :---------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `run.test.ts`: `--block` + non-Python → `getUpstreamBlocks` not called + notice; whole-notebook + non-Python → `getBlockDependencies` not called + notice; python3 → both called |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `run.ts` (`resolveUpstreamExecutionBlockIds`, `validateRequirements`, call sites)                                                                                                |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | new tests green                                                                                                                                                                  |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                                                                                | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` (Python paths unchanged)                                                                                                                                             |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (bypass avoids a subprocess spawn)                                                                                                                                           |          - [ ] Performance requirements are met          |

### Implementation Notes

**Test Strategy:** Mock `getUpstreamBlocks` / `getBlockDependencies` and assert they are NOT called on non-Python and ARE called on `python3` — the observable difference per KD-5. Do not assert "no error surfaced" (already true today).

**Key Implementation Decisions:** Name-based check (`kernelName !== DEFAULT_KERNEL_NAME`) because both sites run pre-connect with no `language` available (KD-3/KD-5). Reuse the existing fatal-branch ordered-execution fallback shape.

## Validation & Closeout

| Task                      | Detail/Link        |
| :------------------------ | :----------------- |
| **Code Review**           | gitban reviewer    |
| **QA Verification**       | mocked unit suites |
| **Staging Deployment**    | N/A (library)      |
| **Production Deployment** | N/A (fork PR)      |
| **Monitoring Setup**      | N/A                |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                                        |
| :-------------------------- | :------------------------------------------------------------------------------ |
| **Postmortem Required?**    | No                                                                              |
| **Further Investigation?**  | No                                                                              |
| **Technical Debt Created?** | No                                                                              |
| **Future Enhancements**     | Language-pluggable reactivity analyzer (own ADR, PRD-002 Future Considerations) |

### Completion Checklist

- [ ] All acceptance criteria are met and verified.
- [ ] All tests are passing (unit, integration, e2e, performance).
- [ ] Code review is approved and PR is merged.
- [ ] Documentation is updated (README, API docs, user guides).
- [ ] Feature is deployed to production.
- [ ] Monitoring and alerting are configured.
- [ ] Stakeholders are notified of completion.
- [ ] Follow-up actions are documented and tickets created.
- [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
