## Bug Overview & Context

- **Ticket/Issue ID:** code-review-high findings on PR muunkky/deepnote#2 (S6INREPO remediation)
- **Affected Component/Service:** `@deepnote/runtime-core` `selectPythonSpec`; `@deepnote/mcp` `resolvePythonEnv`; CLI + MCP + runtime-core test suites
- **Severity Level:** P1 — one real correctness regression (low blast radius) + three test-fidelity gaps in S6INREPO's own deliverable
- **Discovered By:** `/code-review high` on the S6INREPO code branch (findings posted as inline comments on PR #2)
- **Discovery Date:** 2026-06-10
- **Reporter:** CAMERON

**Required Checks:**

- [ ] Ticket/Issue ID is linked above
- [ ] Component/Service is clearly identified
- [ ] Severity level is assigned based on impact

> **Sequencing:** runs as the last work card before the S6INREPO closeout (`o5pg2k`); the closeout completes only after this lands. The fix lands on `sprint/S6INREPO`; the operator then re-extracts the code commits onto the `feat/shared-python-interpreter-resolution` PR branch.

## Definition of Done

### Intent

After this card, an empty or blank interpreter signal can no longer silently break a `deepnote_run`. Before it, the shared selector treated an empty string `pythonPath: ""` (or a blank `DEEPNOTE_PYTHON=`) as a _present_ value and handed `""` to the engine — which then failed on an empty path, a regression from the old `pythonPath || 'python'` behavior. After it, empty/blank signals fall through to the next precedence tier exactly as an absent one would, and the bare-python hint still fires when appropriate. Separately, three tests that _looked_ like they verified behavior but actually asserted against a mock reimplementation, a value derived from the function under test, or merely "is defined" now genuinely fail when the behavior they name regresses. Someone debugging an interpreter-resolution issue would otherwise be misled twice: once by a previously-working empty input now crashing, and once by a green test suite that does not actually guard the precedence/cap it claims to.

### Observable outcomes

- [ ] **Capstone:** with no `--python`/`pythonPath` and `DEEPNOTE_PYTHON=""` (blank), `selectPythonSpec()` returns the autodetected interpreter (not `""`); and via the MCP `deepnote_run` path, `pythonPath: ""` resolves to the autodetect spec and the bare-python hint still fires — both proven by a test that fails on the current `??` code and passes after the fix.
- [ ] `selectPythonSpec` treats empty/whitespace-only `explicit` and `DEEPNOTE_PYTHON` as absent (falls through the precedence chain); its JSDoc no longer documents `??`-style passthrough of empty strings.
- [ ] `resolvePythonEnv` `hasOverride` (execution.ts) uses a truthiness/non-blank check, so a blank `DEEPNOTE_PYTHON=` does not suppress the bare-python hint.
- [ ] CLI `run.test.ts` precedence suite exercises the REAL `selectPythonSpec` (only the autodetect leaf `detectDefaultPython` mocked), so a real precedence regression fails it.
- [ ] `execution.python-env.test.ts` autodetect-tier assertion no longer derives its expected value from `detectDefaultPython()` under test — a wrong autodetect wiring fails it.
- [ ] `agent-handler.test.ts` "maxTurns=10" test asserts the cap value (e.g. `stopWhen` equals `stepCountIs(10)` / inspects the argument), not merely that `stopWhen` is defined.

## Bug Description

### What's Broken

The shared interpreter selector and three S6INREPO tests. (1) `selectPythonSpec` uses `explicit ?? process.env.DEEPNOTE_PYTHON ?? detectDefaultPython()`; `??` does not collapse `""`. (2) Three tests assert against a mock reimplementation / a tautological expected value / a mere `toBeDefined()`.

### Expected Behavior

Empty/blank interpreter signals fall through precedence like absent ones; the engine receives a real spec or the user gets the bare-python hint. Tests fail when the behavior they name regresses.

### Actual Behavior

`pythonPath: ""` (valid per `z.string().optional()` at execution.ts:79) or `DEEPNOTE_PYTHON=` propagates `""` to `ExecutionEngine`, which errors on the empty path — a regression from the previous `pythonPath || 'python'`. The three tests pass even if the real selector's precedence, autodetect wiring, or turn cap regressed.

### Reproduction Rate

- [x] 100% - Always reproduces

## Steps to Reproduce

**Prerequisites:**

- A checkout of the S6INREPO code (sprint branch or the feat PR branch)

**Reproduction Steps:**

1. Call the MCP `deepnote_run` tool with `pythonPath: ""` (or export `DEEPNOTE_PYTHON=` blank and call with no `pythonPath`).
2. Observe the engine is constructed with `pythonEnv: ""`.
3. Observe `resolvePythonExecutable("")` fails instead of falling back to system `python`.

**Error Messages / Stack Traces:**

```
ExecutionEngine constructed with pythonEnv: ""  ->  resolvePythonExecutable("") throws (empty interpreter path)
(Previously: pythonPath || 'python'  ->  ran on system 'python')
```

## Environment Details

| Environment Aspect      | Required | Value                                        | Notes    |
| :---------------------- | :------- | :------------------------------------------- | :------- |
| **Runtime/Framework**   | Optional | Node 22, pnpm 10.19, vitest                  | monorepo |
| **Application Version** | Optional | `@deepnote/runtime-core` 0.4.0 (this branch) |          |

## Impact Assessment

| Impact Category     | Severity | Details                                                                                                               |
| :------------------ | :------- | :-------------------------------------------------------------------------------------------------------------------- |
| **User Impact**     | Low      | Only triggers on an empty/blank interpreter signal — an unusual input — but a previously-working input now hard-fails |
| **Business Impact** | Low      | Pre-merge; caught in review before the PR landed                                                                      |
| **System Impact**   | Low      | Confined to interpreter resolution at run start                                                                       |
| **Data Impact**     | None     |                                                                                                                       |
| **Security Impact** | None     |                                                                                                                       |

**Business Justification for Priority:** P1 because it is a correctness regression in the sprint's core deliverable plus test-fidelity gaps that would let future regressions ship green; low severity but should be fixed before the PR is reviewed for merge.

## Documentation & Code Review

| Item                              | Applicable | File / Location                                          | Notes / Evidence                 | Key Findings / Action Required                                                                      |
| --------------------------------- | :--------: | -------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Related ADRs reviewed             |    yes     | docs/adr/ADR-001-shared-python-interpreter-resolution.md | ADR defines the precedence chain | Fix must preserve `arg > DEEPNOTE_PYTHON > autodetect`; empties-as-absent is consistent with intent |
| Test suite documentation reviewed |    yes     | packages/{runtime-core,mcp,cli} test files               | The three flagged tests          | Action: make each genuinely fail on regression                                                      |
| New Documentation (Action Item)   |    N/A     | **N/A**                                                  | `selectPythonSpec` JSDoc         | Update JSDoc to reflect empties-as-absent                                                           |

## Root Cause Investigation

| Iteration # | Hypothesis                        | Test/Action Taken                                 | Outcome / Findings                                                                 |
| :---------: | :-------------------------------- | :------------------------------------------------ | :--------------------------------------------------------------------------------- | --------- | ----------------------------- | --- | -------------- |
|    **1**    | `??` passes empty strings through | Read `selectPythonSpec` + the old MCP `pythonPath |                                                                                    | 'python'` | Confirmed: `??` keeps `""`; ` |     | ` collapsed it |
|    **2**    | Empty `pythonPath` is reachable   | Checked zod schema                                | Confirmed: `z.string().optional()` at execution.ts:79 (not `nonEmptyStringSchema`) |

### Root Cause Summary

**Root Cause:** Moving the MCP path from `pythonPath || 'python'` (falsy-collapsing) to `selectPythonSpec(... ?? ...)` (nullish) changed empty-string semantics; `""` is now a present value and propagates to the engine. Three tests were written in ways that do not exercise the real behavior they name.

**Code/Config Location:** `packages/runtime-core/src/python-env.ts` (`selectPythonSpec`); `packages/mcp/src/tools/execution.ts:113` (`hasOverride`); the three test files.

**Why This Happened:** `??` vs `||` is a subtle semantic difference; the test gaps are classic mock-the-thing-under-test / derive-expected-from-actual / assert-existence-not-value patterns.

## Solution Design

### Fix Strategy

TDD: write failing tests for the empty/blank fallback (runtime-core unit + MCP integration) and for the three test-fidelity gaps (by first making the named regression occur and confirming the _current_ test wrongly passes), then implement: collapse empty/whitespace to absent in `selectPythonSpec`, tighten `hasOverride`, update JSDoc, and rewrite the three tests to exercise real behavior.

### Code Changes

- `packages/runtime-core/src/python-env.ts` — `selectPythonSpec`: treat empty/whitespace `explicit` and `DEEPNOTE_PYTHON` as absent; update JSDoc.
- `packages/mcp/src/tools/execution.ts` — `hasOverride`: truthiness/non-blank check.
- `packages/runtime-core/src/python-env.test.ts` — add empty/blank fallback cases.
- `packages/cli/src/commands/run.test.ts` — use real `selectPythonSpec`, mock only `detectDefaultPython`.
- `packages/mcp/src/tools/execution.python-env.test.ts` — de-tautologize the autodetect assertion.
- `packages/runtime-core/src/agent-handler.test.ts` — assert the `maxTurns=10` cap value.

### Rollback Plan

Pure code/test change on a fork branch; revert with `git revert` of the remediation commit(s). No migration, no prod deploy.

## TDD Implementation Workflow

|              Step               | Status/Details                                         |                       Universal Check                       |
| :-----------------------------: | :----------------------------------------------------- | :---------------------------------------------------------: |
|    **1. Write Failing Test**    | empty/blank fallback + 3 fidelity tests                |  - [ ] A failing test that reproduces the bug is committed  |
|    **2. Verify Test Fails**     | run scoped vitest                                      | - [ ] Test suite was run and the new test fails as expected |
|    **3. Implement Code Fix**    | selectPythonSpec + hasOverride + JSDoc + test rewrites |        - [ ] Code changes are complete and committed        |
|    **4. Verify Test Passes**    | run scoped vitest                                      |         - [ ] The original failing test now passes          |
|   **5. Run Full Test Suite**    | runtime-core + mcp + cli                               |    - [ ] All existing tests still pass (no regressions)     |
|       **6. Code Review**        | reviewer (gitban)                                      |       - [ ] Code review approved by at least one peer       |
|   **7. Update Documentation**   | `selectPythonSpec` JSDoc                               |            - [ ] Documentation is updated (DaC)             |
|    **8. Deploy to Staging**     | N/A — fork PR, no deploy                               |                          - [x] N/A                          |
|   **9. Staging Verification**   | N/A                                                    |                          - [x] N/A                          |
|  **10. Deploy to Production**   | N/A — merge is upstream maintainers' call              |                          - [x] N/A                          |
| **11. Production Verification** | N/A                                                    |                          - [x] N/A                          |

### Test Code (Failing Test)

```typescript
// runtime-core/src/python-env.test.ts
it("treats a blank DEEPNOTE_PYTHON as absent and falls through to autodetect", () => {
  process.env.DEEPNOTE_PYTHON = "";
  // before fix: returns '' ; after fix: returns the autodetected spec
  expect(selectPythonSpec()).toBe(detectDefaultPython());
});
it("treats an empty explicit arg as absent", () => {
  delete process.env.DEEPNOTE_PYTHON;
  expect(selectPythonSpec({ explicit: "" })).toBe(detectDefaultPython());
});
```

## Infrastructure as Code (IaC) Considerations (optional)

- [x] No infrastructure changes required (pure code/test change)

| IaC Component | Change Required | Status |
| :------------ | :-------------- | :----- |
| **None**      | None            | N/A    |

## Testing & Verification

### Test Plan

| Test Type            | Test Case                                                       | Expected Result                         | Status     |
| :------------------- | :-------------------------------------------------------------- | :-------------------------------------- | :--------- |
| **Unit Test**        | `selectPythonSpec` with `explicit=''` / blank `DEEPNOTE_PYTHON` | Falls through to autodetect             | - [ ] Pass |
| **Integration Test** | MCP `deepnote_run` with `pythonPath: ''`                        | Resolves to autodetect spec; hint fires | - [ ] Pass |
| **Regression Test**  | Real venv path / explicit arg still wins                        | Unchanged                               | - [ ] Pass |
| **Fidelity (CLI)**   | Precedence suite runs real selector                             | Fails on a real precedence regression   | - [ ] Pass |
| **Fidelity (MCP)**   | Autodetect assertion non-tautological                           | Fails on wrong autodetect wiring        | - [ ] Pass |
| **Fidelity (agent)** | maxTurns asserts cap value 10                                   | Fails if cap changes                    | - [ ] Pass |

### Verification Checklist

- [ ] Original bug is no longer reproducible
- [ ] All new tests pass
- [ ] All existing tests still pass (no regressions)
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] No new linter warnings

## Regression Prevention

- [ ] **Automated Test:** empty/blank fallback unit + integration tests added
- [ ] **Integration Test:** MCP `deepnote_run` empty-`pythonPath` path covered
- [ ] **Documentation:** `selectPythonSpec` JSDoc states empties-as-absent

## Validation & Finalization

| Task                     | Detail/Link                          |
| :----------------------- | :----------------------------------- |
| **Code Review**          | gitban reviewer                      |
| **Test Results**         | scoped vitest (runtime-core/mcp/cli) |
| **Documentation Update** | `selectPythonSpec` JSDoc             |

### Follow-up gitban cards

| Topic              | Action Required                                | Tracker  | Gitban Cards |
| :----------------- | :--------------------------------------------- | :------- | :----------- |
| **Related Bugs**   | CLI bare-python hint still tracked separately  | new card | ohoh63       |
| **Technical Debt** | executeAgentBlock tool-wiring/finally coverage | new card | fkxnne       |

### Completion Checklist

- [ ] Root cause is fully understood and documented
- [ ] Fix follows TDD process (failing test → fix → passing test)
- [ ] All tests pass (unit, integration, regression)
- [ ] Documentation updated (DaC)
- [ ] No manual infrastructure changes
- [ ] Regression prevention measures added
- [ ] Follow-up tickets referenced (ohoh63, fkxnne)
- [ ] Associated review findings resolved
