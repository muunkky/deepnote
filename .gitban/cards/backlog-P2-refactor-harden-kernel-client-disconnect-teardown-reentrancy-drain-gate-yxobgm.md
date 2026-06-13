# Harden kernel-client disconnect teardown (reentrancy + drain gate)

**Source:** LUI1WEDGE closeout retrospective Items 7 (L1) + 8 (L2), both wd2nil review 3 follow-ups on commit `1c97429` (the review-2->3 flake fix that introduced the `#withDeadKernelRejectionGuard` teardown machinery). Grouped: same code, same commit, same teardown path. Filed as loose backlog.

## Refactoring Overview & Motivation

* **Refactoring Target:** `KernelClient.disconnect()` teardown — the `#withDeadKernelRejectionGuard` machinery.
* **Code Location:** `packages/runtime-core/src/kernel-client.ts`, `packages/runtime-core/src/kernel-client.test.ts`.
* **Refactoring Type:** make teardown re-entrant + self-tuning drain (technical-debt reduction / robustness).
* **Motivation:** Two distinct fragilities in the same teardown path. (Item 7) `#withDeadKernelRejectionGuard` mutates the process-global `unhandledRejection` listener set; it is safe in the single-engine wedge today, but is NOT re-entrant — concurrent/overlapping `disconnect()` calls (a future multi-session server, or a test racing two teardowns) could leak or double-restore a guard. (Item 8) the teardown drain is a fixed 2 passes x (5 microtask flushes + 1 macrotask), tuned to the CURRENT `@jupyterlab/services` reconnect layering; a library bump that adds an async hop could let the unhandled rejection escape after the guard tears down, resurfacing the Scenario-4 flake — and the existing single-hop unit test would not catch it.
* **Business Impact:** prerequisite hardening before the server grows to multiple concurrent sessions; protects the real-venv determinism guarantee across dependency bumps.
* **Scope:** one method + its tests; ~tens of lines.
* **Risk Level:** Low — currently-unreachable concurrency path; behavior-preserving for the single-engine design.
* **Related Work:** LUI1WEDGE card wd2nil; commit `1c97429`.

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
| **Existing Code** | `kernel-client.ts` `disconnect()` | removeAllListeners -> install guard -> restore prior listeners; not re-entrant |
| **Test Coverage** | `kernel-client.test.ts` | models a single-hop leak only |
| **Documentation** | inline comments near drain | magic count tuned to current jupyterlab layering |
| **Style Guide** | repo Biome config | follow existing |
| **Dependencies** | `@jupyterlab/services` | drain count is coupled to its internal reconnect layering |
| **Usage Patterns** | `close()` on SIGINT | single `Session`, serialized, fires once today |
| **Previous Attempts** | commit `1c97429` | introduced the guard machinery (review-2->3 flake fix) |

## Refactoring Strategy & Risk Assessment

> Two-part hardening on the same teardown path.

**Refactoring Approach:**
* Item 7: add a re-entrancy guard (ref-count or "already-armed" flag) so nested/overlapping `disconnect()` calls share one armed window and the listener set is restored exactly once when the last caller exits.
* Item 8: regression gate (minimum) — on the next `@jupyterlab/services` bump, re-run the 5-10x real-venv determinism check (`server-run-parity.integration.test.ts`), capturing exit codes and grepping for `Unhandled Rejection`; document it as a required check tied to that bump. Optional hardening — make the drain self-tuning (loop until a quiescent tick with no escaped rejection) rather than a fixed magic count.

**Incremental Steps:**
1. Add re-entrancy guard + test overlapping disconnect.
2. Document the `@jupyterlab/services`-bump regression gate near the drain / integration README.
3. (Optional) replace fixed drain count with a quiescence loop.

**Risk Mitigation:**
* Behavior-preserving: single-engine path must remain identical (5/5 + 10/10 clean real-venv exits).
* Risk: self-tuning loop could spin — bound it with a max-iteration cap.

**Rollback Plan:**
* Revert the commit; the fixed-count drain is correct against the pinned version.

**Success Criteria:**
* Overlapping `disconnect()` restores the listener set exactly once.
* Real-venv determinism check stays green; gate documented for the next dependency bump.
* No regression in the single-engine teardown.

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | overlapping-disconnect test | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | 5-10x real-venv determinism baseline | - [ ] Baseline metrics captured (complexity, performance, coverage). |
| **Incremental Refactoring** | reentrancy guard + drain gate | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | regression-gate note | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | pending | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation** | drain still quiesces | - [ ] Performance validated - no regression, ideally improvement. |
| **Staging Deployment** | N/A | - [ ] Refactored code validated in staging environment. |
| **Production Deployment** | N/A | - [ ] Refactored code deployed to production with monitoring. |

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | overlapping-disconnect + multi-hop leak tests | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | mocked + integration | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | real-venv determinism 5-10x | - [ ] Baseline metrics captured for comparison. |
| **4. Make Smallest Refactor** | add reentrancy flag | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | pending | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | pending | - [ ] Incremental change committed (enables easy rollback). |
| **7. Repeat Steps 4-6** | drain gate / self-tuning | - [ ] All incremental refactoring steps completed with passing tests. |
| **8. Update Documentation** | regression-gate note | - [ ] All documentation updated. |
| **9. Style & Linting Check** | Biome | - [ ] Code passes linting, type checking, and style guide validation. |
| **10. Code Review** | pending | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | drain quiesces | - [ ] Performance validated - no regression detected. |
| **12. Deploy to Staging** | N/A | - [ ] Refactored code validated in staging environment. |
| **13. Production Deployment** | N/A | - [ ] Gradual production rollout with monitoring. |

#### Refactoring Implementation Notes

> Re-entrant teardown + a documented dependency-bump regression gate; optional self-tuning drain.

**Refactoring Techniques Applied:**
* Ref-count / armed-flag guard around the listener swap.
* Quiescence-loop drain (optional) replacing the magic count.

**Design Patterns Introduced:**
* Re-entrant resource guard.

**Code Quality Improvements:**
* Removes a hidden multi-session concurrency hazard; removes a dependency-coupled magic constant.

**Before/After Comparison:**
```python
# Before: removeAllListeners(); install guard; restore prior — not re-entrant; fixed drain count
# After: armed-flag guards the swap; restore-once; drain loops to quiescence (or gated on dep bump)
```

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | `packages/runtime-core/src/kernel-client.ts`, `kernel-client.test.ts` |
| **Test Suite** | overlapping-disconnect + multi-hop leak coverage |
| **Baseline Metrics (Before)** | fixed 2x(5+1) drain; single-hop test |
| **Final Metrics (After)** | re-entrant guard; documented dep-bump gate |
| **Performance Validation** | real-venv determinism stays green |
| **Style & Linting** | Biome clean |
| **Code Review** | pending |
| **Documentation Updates** | regression-gate note near drain / integration README |
| **Staging Validation** | N/A |
| **Production Deployment** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | revisit when multi-session lands |
| **Design Patterns Reusable?** | re-entrant guard pattern |
| **Test Suite Improvements?** | multi-hop leak model |
| **Documentation Complete?** | dep-bump gate documented |
| **Performance Impact?** | neutral |
| **Team Knowledge Sharing?** | N/A |
| **Technical Debt Reduced?** | Yes — two teardown fragilities |
| **Code Quality Metrics Improved?** | removes magic constant + concurrency hazard |

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
