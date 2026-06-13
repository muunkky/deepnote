# TDD Test Implementation for server-run parity Scenario 1

**Source:** LUI1WEDGE closeout retrospective Item 5 (wd2nil review 1 + 2, L1). Filed as loose backlog.

## Overview & Context for server-run parity Scenario 1

* **Component/Feature:** `@deepnote/runtime-server` real-kernel parity suite, Scenario 1 (`test-integration/server-run-parity.integration.test.ts:237-249`).
* **Related Work:** LUI1WEDGE card wd2nil (server-integration-tests).
* **Motivation:** Scenario 1 asserts `[...serverByBlock.keys()].sort()` deep-equals `[...cliByBlock.keys()].sort()`. `cliByBlock` is built from ALL CLI blocks; `serverByBlock` only contains blocks that emitted an `output` event. Today every executable block in the fixture produces >=1 output so the key sets match, but adding a no-output executable block (e.g. `x = 1`) diverges the key sets and reds Scenario 1 for a reason unrelated to parity. The L2-wording sub-item (coverage-claim-vs-fixture) is ALREADY RESOLVED in `README.md:228-245` and needs no action — this card is ONLY the Scenario 1 union-of-keys hardening.

**Required Checks:**
* [ ] Component or feature being tested is identified above.
* [ ] Related work or original card is linked.
* [ ] Clear motivation for pausing to add tests is documented.

## Initial Assessment

> Compare on the UNION of the two key sets and deep-equal `serverByBlock.get(id) ?? []` against `cliByBlock.get(id) ?? []`, so a both-empty block reads as parity rather than a key mismatch — while still failing loudly if one side has outputs the other lacks.

* Concern: latent fixture-fragility when a zero-output executable block is added.
* Gap: assertion compares key-presence, not per-block output equality on the union.
* Risk: future fixture broadening reds the suite for a non-parity reason.

### Current Test Coverage Analysis

| Test Type | Current Coverage | Gap Identified | Priority |
| :--- | :--- | :--- | :---: |
| **Unit Tests** | n/a | n/a | P2 |
| **Integration Tests** | Scenario 1 key-set equality | not safe for zero-output blocks | P2 |
| **Edge Cases** | none | both-empty block should read as parity | P2 |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | add a zero-output executable block to the fixture; current assertion reds | - [ ] Failing tests are written and committed. |
| **2. Implement Code** | union-of-keys + per-block `?? []` deep-equal | - [ ] Minimal code to make tests pass is implemented. |
| **3. Verify Tests Pass** | `test:integration` (real venv) | - [ ] All new tests are passing. |
| **4. Refactor** | N/A | - [ ] Code is refactored for quality (or N/A is documented). |
| **5. Regression Check** | full integration suite | - [ ] Full test suite passes with no regressions. |

### Test Cases Defined

| Test Case # | Description | Input | Expected Output | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | both-empty block reads as parity | zero-output executable block | parity holds | Not Started |
| **2** | one-sided output still fails loudly | output on server only | assertion fails | Not Started |

#### Test Implementation Notes (Optional)

> Hardening lives at `server-run-parity.integration.test.ts:237-249`; broaden `fixtures/server-run-parity.deepnote` only if needed.

```python
# union(serverKeys, cliKeys); for each id: serverByBlock.get(id) ?? [] deepEquals cliByBlock.get(id) ?? []
```

## Test Execution & Verification

| Iteration # | Test Batch | Action Taken | Outcome |
| :---: | :--- | :--- | :--- |
| **1** | Scenario 1 | run integration suite | pending |

---
#### Iteration 1: Initial Test Run

**Test Batch:** Scenario 1 union-of-keys

**Action Taken:** pending

**Outcome:** pending

## Coverage Verification

| Metric | Before | After | Target Met? |
| :--- | :---: | :---: | :---: |
| **Line Coverage** | n/a | n/a | N |
| **Branch Coverage** | n/a | n/a | N |
| **Test Count** | +0 | +1 | N |

* [ ] Coverage report generated and reviewed.
* [ ] All critical paths are now tested.
* [ ] Edge cases identified in assessment are covered.

## Completion & Follow-up

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | pending |
| **CI/CD Verification** | pending |
| **Coverage Report** | pending |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Similar Gaps Elsewhere?** | other parity scenarios |
| **Process Improvement** | union-of-keys pattern for parity asserts |
| **Future Refactoring** | N/A |
| **Documentation Updates** | wording already resolved (README:228-245) |

### Completion Checklist

* [ ] All test cases defined in the table are implemented.
* [ ] All tests are passing.
* [ ] Code coverage meets or exceeds target for this component.
* [ ] Full regression suite passes with no failures.
* [ ] Code is refactored and clean.
* [ ] Changes are committed and pushed.
* [ ] Follow-up actions are documented or tickets created.
* [ ] Original work (feature/bug) can be resumed with confidence.
