# Single-source KD-3 integration helpers across cli/runtime-core

**Source:** LUI1WEDGE closeout retrospective Item 9 (yzd78n review 1, L1+L2+L3 — grouped by the reviewer into one card; they share one fix shape and one single-source-of-truth capstone). Filed as loose backlog.

## Refactoring Overview & Motivation

* **Refactoring Target:** the KD-3 integration helpers duplicated across the cli <-> runtime-core boundary.
* **Code Location:** `packages/cli/src/constants.ts`, `packages/runtime-core/src/integrations/constants.ts`, `packages/cli/src/utils/file-resolver.ts`, `packages/runtime-core/src/integrations/errno.ts`, `packages/cli/src/commands/run.ts`, `packages/runtime-core/src/integrations/` (`resolveIntegrationEnv`).
* **Refactoring Type:** DRY consolidation — make runtime-core the single source of truth (re-export/consume shim pattern).
* **Motivation:** The KD-3 lift made runtime-core the home of the shared integration helpers but left the cli side as duplicated copies / inlined orchestration. Three sub-fixes, one root cause:
  - **L1 (dry-shared-constants):** `DEFAULT_INTEGRATIONS_FILE` and `BUILTIN_INTEGRATIONS` are defined in BOTH cli `constants.ts` and runtime-core `integrations/constants.ts` — byte-identical today, two sources of truth; drift makes `deepnote run` and the server disagree on the integrations-file name / built-in set (the exact parity divergence KD-3 was meant to eliminate).
  - **L2 (dry-shared-errno):** `isErrnoException` / `isErrnoENOENT` exist in BOTH cli `file-resolver.ts` and runtime-core `integrations/errno.ts` (lower stakes, a 2-line predicate). file-resolver retains other consumers + a sibling `isErrnoENOTDIR`, so re-export rather than move.
  - **L3 (parity-orchestration-asymmetry):** `run.ts` still inlines the `parse -> collect -> fetch -> inject` sequence rather than calling the shared `resolveIntegrationEnv`, so orchestration is single-sourced on the server side only.
* **Business Impact:** fully realizes the parity guarantee the KD-3 lift promised — runtime-core becomes the single source of truth for the integration constants, errno predicates, AND env-resolution orchestration.
* **Scope:** mechanical re-export/consume across ~6 files + behavior-preserving verification.
* **Risk Level:** Low — byte-identical/tested-green today; L3 must remain behavior-preserving.
* **Related Work:** LUI1WEDGE card yzd78n; KD-3 lift commit `5b1897d`.

**Required Checks:**
* [ ] **Refactoring motivation** clearly explains why this change is needed.
* [ ] **Scope** is specific and bounded (not open-ended "improve everything").
* [ ] **Risk level** is assessed based on code criticality and usage.

## Pre-Refactoring Context Review

* [ ] Existing code reviewed and behavior fully understood.
* [ ] Test coverage reviewed - current test suite provides safety net.
* [ ] Documentation reviewed (README, docstrings, inline comments).
* [ ] Style guide and coding standards reviewed for compliance.
* [ ] Dependencies reviewed (internal modules, external libraries).
* [ ] Usage patterns reviewed (who calls this code, how it's used).
* [ ] Previous refactoring attempts reviewed (if any - learn from history).

| Review Source | Link / Location | Key Findings / Constraints |
| :--- | :--- | :--- |
| **Existing Code** | cli `constants.ts` / runtime-core `integrations/constants.ts` | duplicated `DEFAULT_INTEGRATIONS_FILE` + `BUILTIN_INTEGRATIONS` |
| **Test Coverage** | run integration tests + `session-integration-env.test.ts` | must stay green (parity capstone) |
| **Documentation** | KD-3 lift notes | runtime-core is the intended home |
| **Style Guide** | repo Biome | follow existing shim pattern (parse/collect/inject/schemas) |
| **Dependencies** | cli call sites (`cli.ts`, `commands/integrations.ts`, `utils/analysis.ts`, `commands/lint.test.ts`) | keep importing from cli `constants.ts` unchanged (re-export) |
| **Usage Patterns** | `file-resolver` consumers (`dotenv.ts`, `commands/integrations.ts`) + `isErrnoENOTDIR` | keep `isErrnoENOTDIR` local if not lifted |
| **Previous Attempts** | KD-3 lift (yzd78n) | helpers already exist + tested green; consolidation only |

## Refactoring Strategy & Risk Assessment

> Three independently shippable sub-fixes, all on the single-source-of-truth capstone.

**Refactoring Approach:**
* L1: cli `constants.ts` re-exports both constants from `@deepnote/runtime-core` (same shim pattern already applied to parse/collect/inject/schemas).
* L2: file-resolver re-exports `isErrno*` from `@deepnote/runtime-core` (keep `isErrnoENOTDIR` local if not lifted).
* L3: `run.ts` consumes `resolveIntegrationEnv`, threading its terminal warning-display callback (the concern that kept it inlined) so orchestration is single-sourced.

**Incremental Steps:**
1. L1 re-export (high value).
2. L2 re-export (trivial).
3. L3 orchestration consume (behavior-preserving).

**Risk Mitigation:**
* L3 must be behavior-preserving — verify `deepnote run`'s integration tests and `session-integration-env.test.ts` stay green.

**Rollback Plan:**
* Revert per sub-fix; each is independently shippable.

**Success Criteria:**
* runtime-core is the single source for the constants, the errno predicates, and the env-resolution orchestration.
* No behavior change to `deepnote run`; parity capstone stays green.

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | run integration + parity capstone | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | green baseline | - [ ] Baseline metrics captured (complexity, performance, coverage). |
| **Incremental Refactoring** | L1 -> L2 -> L3 | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | note shim direction | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | pending | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation** | N/A | - [ ] Performance validated - no regression, ideally improvement. |
| **Staging Deployment** | N/A | - [ ] Refactored code validated in staging environment. |
| **Production Deployment** | N/A | - [ ] Refactored code deployed to production with monitoring. |

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | run + parity tests | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | mocked + integration | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | green | - [ ] Baseline metrics captured for comparison. |
| **4. Make Smallest Refactor** | L2 errno re-export | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | pending | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | pending | - [ ] Incremental change committed (enables easy rollback). |
| **7. Repeat Steps 4-6** | L1 then L3 | - [ ] All incremental refactoring steps completed with passing tests. |
| **8. Update Documentation** | shim-direction note | - [ ] All documentation updated. |
| **9. Style & Linting Check** | Biome | - [ ] Code passes linting, type checking, and style guide validation. |
| **10. Code Review** | pending | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | N/A | - [ ] Performance validated - no regression detected. |
| **12. Deploy to Staging** | N/A | - [ ] Refactored code validated in staging environment. |
| **13. Production Deployment** | N/A | - [ ] Gradual production rollout with monitoring. |

#### Refactoring Implementation Notes

> Re-export shim pattern (L1/L2) + orchestration consume (L3).

**Refactoring Techniques Applied:**
* Re-export shim from cli to `@deepnote/runtime-core`.
* Callback-threaded orchestration consume.

**Design Patterns Introduced:**
* Single source of truth across the package boundary.

**Code Quality Improvements:**
* Eliminates two duplicated definitions and one inlined orchestration.

**Before/After Comparison:**
```python
# Before: constants/errno duplicated in cli; run.ts inlines parse->collect->fetch->inject
# After: cli re-exports from runtime-core; run.ts calls resolveIntegrationEnv(warnCb)
```

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | cli constants/file-resolver/run.ts + runtime-core integrations |
| **Test Suite** | run integration + `session-integration-env.test.ts` stay green |
| **Baseline Metrics (Before)** | duplicated constants/errno; inlined orchestration |
| **Final Metrics (After)** | single-sourced across the boundary |
| **Performance Validation** | N/A |
| **Style & Linting** | Biome clean |
| **Code Review** | pending |
| **Documentation Updates** | shim-direction note |
| **Staging Validation** | N/A |
| **Production Deployment** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | scan for other cross-boundary dupes |
| **Design Patterns Reusable?** | re-export shim |
| **Test Suite Improvements?** | already covered |
| **Documentation Complete?** | shim direction |
| **Performance Impact?** | neutral |
| **Team Knowledge Sharing?** | N/A |
| **Technical Debt Reduced?** | Yes — closes the KD-3 DRY gap |
| **Code Quality Metrics Improved?** | removes 2 dup definitions + 1 inlined sequence |

### Completion Checklist

* [ ] Comprehensive tests exist before refactoring (95%+ coverage target).
* [ ] All tests pass before refactoring begins (baseline established).
* [ ] Baseline metrics captured (complexity, coverage, performance).
* [ ] Refactoring implemented incrementally (small, safe steps).
* [ ] All tests pass after each refactoring step (continuous validation).
* [ ] Documentation updated (docstrings, README, inline comments, architecture docs).
* [ ] Code passes style guide validation (linting, type checking).
* [ ] Code reviewed by at least 2 team members.
* [ ] No performance regression (ideally improvement).
* [ ] Refactored code validated in staging environment.
* [ ] Production deployment successful with monitoring.
* [ ] Code quality metrics improved (complexity, coverage, maintainability).
* [ ] Rollback plan documented and tested (if high-risk refactor).
