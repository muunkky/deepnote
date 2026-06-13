# TDD Test Implementation for runtime-server kernel-free open guarantee

**When to use this template:** targeted test-coverage hardening for the KD-6 kernel-free guarantee.

**Source:** LUI1WEDGE closeout retrospective Item 1 (x71bcm review 1, L2). Filed as loose backlog.

## Overview & Context for runtime-server kernel-free open

* **Component/Feature:** `@deepnote/runtime-server` — `loadProject` / `GET /api/project` kernel-free guarantee (KD-6).
* **Related Work:** LUI1WEDGE cards x71bcm (open/list API) and hlai4c (execute-stream-ws, which lands the constructible `ExecutionEngine`).
* **Motivation:** The "opens with NO kernel started" test asserts only the positive signal (a populated `ApiProject` comes back). It cannot yet assert the negative — that no `ExecutionEngine` is ever constructed during `loadProject` / `GET /api/project` — because the engine only became constructible once hlai4c landed `startEngine`. A future refactor could silently start constructing an engine on open and the suite would stay green.

**Required Checks:**
* [ ] Component or feature being tested is identified above.
* [ ] Related work or original card is linked.
* [ ] Clear motivation for pausing to add tests is documented.

## Initial Assessment

> The KD-6 kernel-free guarantee is currently enforced only by a positive assertion. Now that hlai4c has landed a constructible `ExecutionEngine`, add a regression test that spies on engine construction and asserts `loadProject` / `GET /api/project` never triggers it.

* Concern: a future change could construct an engine on open and the suite would stay green.
* Gap: no negative assertion that `ExecutionEngine` is never constructed during open/list.
* Risk: silent regression of the kernel-free guarantee.

### Current Test Coverage Analysis

| Test Type | Current Coverage | Gap Identified | Priority |
| :--- | :--- | :--- | :---: |
| **Unit Tests** | positive-only (populated `ApiProject`) | no engine-construction-spy negative assertion | P2 |
| **Integration Tests** | n/a | n/a | P2 |
| **Edge Cases** | none | open never constructs an engine | P2 |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | spy on `ExecutionEngine` construction; assert 0 calls during `GET /api/project` | - [ ] Failing tests are written and committed. |
| **2. Implement Code** | none expected (guarantee already holds) | - [ ] Minimal code to make tests pass is implemented. |
| **3. Verify Tests Pass** | mocked `pnpm test` | - [ ] All new tests are passing. |
| **4. Refactor** | N/A | - [ ] Code is refactored for quality (or N/A is documented). |
| **5. Regression Check** | full mocked suite | - [ ] Full test suite passes with no regressions. |

### Test Cases Defined

| Test Case # | Description | Input | Expected Output | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | open never constructs an engine | `GET /api/project` | engine-construction spy called 0 times | Not Started |
| **2** | list never constructs an engine | `loadProject` | engine-construction spy called 0 times | Not Started |

#### Test Implementation Notes (Optional)

> Spy target arrives via hlai4c / step 4A; lives in `packages/runtime-server/src/session.test.ts`.

```python
# pseudocode: spy on ExecutionEngine ctor, call loadProject, expect 0 constructions
```

## Test Execution & Verification

| Iteration # | Test Batch | Action Taken | Outcome |
| :---: | :--- | :--- | :--- |
| **1** | engine-spy | run mocked suite | pending |

---
#### Iteration 1: Initial Test Run

**Test Batch:** engine-construction-spy negative assertion

**Action Taken:** pending

**Outcome:** pending

## Coverage Verification

| Metric | Before | After | Target Met? |
| :--- | :---: | :---: | :---: |
| **Line Coverage** | n/a | n/a | N |
| **Branch Coverage** | n/a | n/a | N |
| **Test Count** | +0 | +2 | N |

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
| **Similar Gaps Elsewhere?** | watch other kernel-free invariants |
| **Process Improvement** | negative-assertion pattern for lifecycle guarantees |
| **Future Refactoring** | N/A |
| **Documentation Updates** | N/A |

### Completion Checklist

* [ ] All test cases defined in the table are implemented.
* [ ] All tests are passing.
* [ ] Code coverage meets or exceeds target for this component.
* [ ] Full regression suite passes with no failures.
* [ ] Code is refactored and clean.
* [ ] Changes are committed and pushed.
* [ ] Follow-up actions are documented or tickets created.
* [ ] Original work (feature/bug) can be resumed with confidence.
