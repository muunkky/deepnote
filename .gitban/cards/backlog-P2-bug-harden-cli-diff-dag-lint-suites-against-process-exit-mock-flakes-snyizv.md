# Harden cli diff/dag/lint suites against process.exit-mock flakes

**Source:** LUI1WEDGE closeout retrospective Item 11 (dx99dj review 1, L3). Filed as loose backlog (pre-existing, upstream-shaped flake debt).

## Bug Overview & Context

* **Ticket/Issue ID:** LUI1WEDGE card dx99dj (contrib-diff cut).
* **Affected Component/Service:** `@deepnote/cli` test suites — `diff.test.ts`, `dag.test.ts`, `lint.test.ts`.
* **Severity Level:** P2 — recurring test flake on constrained machines; not a runtime bug.
* **Discovered By:** dx99dj review 1 (forced a `--no-verify` push workaround).
* **Discovery Date:** 2026-06.
* **Reporter:** dx99dj reviewer.

**Required Checks:**
* [ ] Ticket/Issue ID is linked above
* [ ] Component/Service is clearly identified
* [ ] Severity level is assigned based on impact

## Bug Description

### What's Broken

The cli `diff.test.ts`, `dag.test.ts`, and `lint.test.ts` suites flake on constrained machines due to a `process.exit`-mock / test-isolation + 5s-timeout artifact: the same failures reproduce on the milestone worktree under isolated `vitest run <file>`, while the full suite of 2476 passes.

### Expected Behavior

The full cli hook suite runs cleanly on constrained machines so contrib-slice pushes do not need `--no-verify`.

### Actual Behavior

`process.exit`-mock leakage / per-test isolation under the 5s timeout produces intermittent failures on low-resource boxes.

### Reproduction Rate

* [ ] 100% - Always reproduces
* [ ] 75% - Usually reproduces
* [x] 50% - Sometimes reproduces
* [ ] 25% - Rarely reproduces
* [ ] Cannot reproduce consistently

## Steps to Reproduce

**Prerequisites:**
* A constrained / low-memory machine.
* The milestone worktree.

**Reproduction Steps:**

1. Run `vitest run packages/cli/src/commands/diff.test.ts` (or dag/lint) in isolation on a constrained box.
2. Observe intermittent `process.exit`-mock / 5s-timeout failures.
3. Note the full suite (2476) passes — flake is isolation/timeout-shaped, not a real regression.

**Error Messages / Stack Traces:**

```
intermittent: process.exit mock leakage / test exceeded 5000ms timeout
```

## Environment Details

| Environment Aspect | Required | Value | Notes |
| :--- | :--- | :--- | :--- |
| **Environment** | Optional | Local (constrained) | flake surface |
| **OS** | Optional | Linux | constrained box |
| **Browser** | Optional | N/A | not a web app |
| **Application Version** | Optional | milestone/m3-local-ui | files byte-identical to upstream/main |
| **Database Version** | Optional | N/A | n/a |
| **Runtime/Framework** | Optional | Node 22 / vitest | 5s default timeout |
| **Dependencies** | Optional | vitest | isolation/timeout |
| **Infrastructure** | Optional | local | constrained CPU/memory |

## Impact Assessment

| Impact Category | Severity | Details |
| :--- | :--- | :--- |
| **User Impact** | None | test-only; no runtime effect |
| **Business Impact** | Low | slows contrib-slice pushes (forced `--no-verify`) |
| **System Impact** | Low | CI noise on constrained runners |
| **Data Impact** | None | none |
| **Security Impact** | None | none |

**Business Justification for Priority:**

P2 — recurring developer-experience debt that forced a `--no-verify` workaround, but no runtime impact and the files are byte-identical to `upstream/main` (pre-existing upstream-shaped flakes).

## Documentation & Code Review

| Item | Applicable | File / Location | Notes / Evidence | Key Findings / Action Required |
|---|:---:|---|---|---|
| README or component documentation reviewed | no | packages/cli/README.md | n/a | none |
| Related ADRs reviewed | no | docs/adr/ | n/a | none |
| API documentation reviewed | no | n/a | n/a | none |
| Test suite documentation reviewed | yes | packages/cli/src/commands/*.test.ts | process.exit mock + 5s timeout | fix mock isolation and/or raise+justify the timeout |
| IaC configuration reviewed | no | n/a | n/a | none |
| New Documentation (Action Item) | N/A | N/A | record the timeout justification | document any timeout change |

## Root Cause Investigation

| Iteration # | Hypothesis | Test/Action Taken | Outcome / Findings |
| :---: | :--- | :--- | :--- |
| **1** | process.exit mock leaks across tests | isolated `vitest run <file>` | reproduces in isolation; full suite passes |
| **2** | 5s default timeout too tight on constrained box | observe timings | timeouts on low-resource machines |
| **3** | files differ from upstream | diff vs upstream/main | byte-identical — pre-existing upstream-shaped flake |

### Hypothesis testing iterations

**Iteration 1:** process.exit mock leakage

**Hypothesis:** the `process.exit` mock is not reset per test.

**Test/Action Taken:** run the three suites in isolation.

**Outcome:** isolation/timeout-shaped flake confirmed; not a real regression.

---

**Iteration 2:** 5s timeout

**Hypothesis:** the default 5s timeout is too tight under load.

**Test/Action Taken:** observe per-test timings on a constrained box.

**Outcome:** timeouts under resource pressure.

---

**Iteration 3:** upstream-shaped

**Hypothesis:** introduced by this sprint.

**Test/Action Taken:** diff the three files against `upstream/main`.

**Outcome:** byte-identical — pre-existing, not sprint-introduced.

### Root Cause Summary

**Root Cause:**

`process.exit`-mock leakage / insufficient per-test isolation, compounded by the 5s default timeout, surfaces intermittently on constrained machines.

**Code/Config Location:**

`packages/cli/src/commands/diff.test.ts`, `dag.test.ts`, `lint.test.ts`.

**Why This Happened:**

Pre-existing upstream test patterns that only flake under resource pressure; the sprint's constrained-box dispatch exposed them.

## Solution Design

### Fix Strategy

Fix the `process.exit`-mock leakage / per-test isolation (reset the mock per test), and/or raise+justify the 5s timeout, so future contrib-slice pushes can run the full hook suite without flake noise. Keep changes minimal given the files are byte-identical to upstream (fork-contribution context).

### Code Changes

* `packages/cli/src/commands/diff.test.ts` — isolate the `process.exit` mock.
* `packages/cli/src/commands/dag.test.ts` — same.
* `packages/cli/src/commands/lint.test.ts` — same; raise+justify timeout if needed.

### Rollback Plan

Revert the test-only changes; no runtime risk.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Test** | reproduce the leakage deterministically | - [ ] A failing test that reproduces the bug is committed |
| **2. Verify Test Fails** | constrained run | - [ ] Test suite was run and the new test fails as expected |
| **3. Implement Code Fix** | mock isolation / timeout | - [ ] Code changes are complete and committed |
| **4. Verify Test Passes** | re-run | - [ ] The original failing test now passes |
| **5. Run Full Test Suite** | full hook suite | - [ ] All existing tests still pass (no regressions) |
| **6. Code Review** | pending | - [ ] Code review approved by at least one peer |
| **7. Update Documentation** | timeout justification | - [ ] Documentation is updated (DaC) |
| **8. Deploy to Staging** | N/A | - [ ] Fix deployed to staging environment |
| **9. Staging Verification** | N/A | - [ ] Bug fix verified in staging environment |
| **10. Deploy to Production** | N/A | - [ ] Fix deployed to production environment |
| **11. Production Verification** | N/A | - [ ] Bug fix verified in production environment |

### Test Code (Failing Test)

> Reproduce the mock leakage deterministically before fixing.

```typescript
// reset process.exit mock per test; assert no cross-test leakage
```

## Infrastructure as Code (IaC) Considerations (optional)

* [ ] Infrastructure changes required (e.g., environment variables, scaling, new resources)
* [ ] IaC code updated (Terraform, Pulumi, CloudFormation, Kubernetes manifests, etc.)
* [ ] IaC changes reviewed and approved
* [ ] IaC changes tested in non-production environment
* [ ] IaC changes deployed via automation (no manual changes)

| IaC Component | Change Required | Status |
| :--- | :--- | :--- |
| **Environment Variables** | none | N/A |
| **Scaling** | none | N/A |
| **New Resource** | none | N/A |

## Testing & Verification

### Test Plan

| Test Type | Test Case | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Unit Test** | process.exit mock isolated | no cross-test leakage | - [ ] Pass |
| **Integration Test** | full hook suite on constrained box | no flake | - [ ] Pass |
| **Regression Test** | full 2476 suite | still green | - [ ] Pass |
| **Edge Case 1** | repeated isolated runs of diff.test | stable | - [ ] Pass |
| **Edge Case 2** | repeated isolated runs of dag/lint | stable | - [ ] Pass |
| **Performance Test** | timing under load | within (justified) timeout | - [ ] Pass |
| **Manual Test** | run hook suite without `--no-verify` | clean | - [ ] Pass |

### Verification Checklist

* [ ] Original bug is no longer reproducible
* [ ] All new tests pass
* [ ] All existing tests still pass (no regressions)
* [ ] Code review completed and approved
* [ ] Documentation updated
* [ ] Staging environment verification complete
* [ ] Production environment verification complete
* [ ] Monitoring shows healthy metrics (no new errors)

## Regression Prevention

* [ ] **Automated Test:** deterministic mock-isolation test added
* [ ] **Integration Test:** full-hook-suite run on a constrained profile
* [ ] **Type Safety:** N/A
* [ ] **Linting Rules:** N/A
* [ ] **Code Review Checklist:** note process.exit mock reset requirement
* [ ] **Monitoring/Alerting:** N/A
* [ ] **Documentation:** record timeout justification

## Validation & Finalization

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | pending |
| **Test Results** | pending |
| **Staging Verification** | N/A |
| **Production Verification** | N/A |
| **Documentation Update** | timeout justification |
| **Monitoring Check** | N/A |

### Follow-up gitban cards

| Topic | Action Required | Tracker | Gitban Cards |
| :--- | :--- | :--- |
| **Postmortem** | No (P2 flake) | this card | n/a |
| **Documentation Debt** | timeout justification | this card | n/a |
| **Technical Debt** | upstream-shaped flake debt | this card | n/a |
| **Process Improvement** | constrained-runner profile | this card | n/a |
| **Related Bugs** | other process.exit-mock suites | this card | n/a |

### Completion Checklist

* [ ] Root cause is fully understood and documented
* [ ] Fix follows TDD process (failing test → fix → passing test)
* [ ] All tests pass (unit, integration, regression)
* [ ] Documentation updated (DaC - Documentation as Code)
* [ ] No manual infrastructure changes
* [ ] Deployed and verified
* [ ] Monitoring confirms fix is working (no new errors)
* [ ] Regression prevention measures added (tests, types, alerts)
* [ ] Postmortem completed (if required for P0/P1)
* [ ] Follow-up tickets created for related issues
* [ ] Associated ticket is closed
