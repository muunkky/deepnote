# TDD Test Implementation for runtime-core agent-handler (executeAgentBlock)

**When to use this template:** Coverage-hardening for two non-blocking gaps surfaced in S6INREPO card `1yecdf` review 1. Both live in `packages/runtime-core/src/agent-handler.test.ts`.

**When NOT to use this template:** Not a behavior change — `executeAgentBlock` already works; this only closes test-assertion gaps.

## Overview & Context for executeAgentBlock (runtime-core agent-handler)

- **Component/Feature:** `executeAgentBlock` in `packages/runtime-core/src/agent-handler.ts`
- **Related Work:** S6INREPO card `1yecdf` (step 2B, commit 7c0f292); deferred via closeout card `o5pg2k` retro Items 1 & 2.
- **Motivation:** Two assertion gaps in the shipped tests — (1) the agent-tool `execute` bindings are never asserted, so a swapped/dropped binding would pass; (2) the MCP client lifecycle and close-error `finally` branch are never entered because all tests use `mcpServers: []`.

**Required Checks:**

- [ ] Component or feature being tested is identified above.
- [ ] Related work or original card is linked.
- [ ] Clear motivation for pausing to add tests is documented.

---

## Initial Assessment

> Two distinct coverage gaps, both in `agent-handler.test.ts`, both non-blocking and with no external prerequisite.

- Gap 1 (retro Item 1): The two real agent tools register `execute: context.addAndExecuteCodeBlock` (`add_code_block`, agent-handler.ts:199) and `execute: context.addMarkdownBlock` (`add_markdown_block`, line 207), but the fake `ToolLoopAgent` replays pre-recorded `tool-result` parts rather than invoking registered tools' `execute`. The `makeContext` `vi.fn` callbacks are never called, so a swapped or dropped `execute` binding would not be caught.
- Gap 2 (retro Item 2): `executeAgentBlock` merges/instantiates MCP clients (`mergeMcpConfigs` + `createMCPClient`, agent-handler.ts:177-191) and closes them in a `finally` with per-client error handling (lines 247-256). All card-1yecdf tests use `mcpServers: []`, so neither the client-instantiation path nor the close-error `finally` branch is exercised.
- Risk: regressions in tool wiring or MCP close-error handling ship silently.

### Current Test Coverage Analysis

| Test Type             | Current Coverage                                | Gap Identified                                                                               | Priority |
| :-------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------- | :------: |
| **Unit Tests**        | `agent-handler.test.ts` 41 tests passing        | No assertion on `captured.settings.tools[*].execute` bindings                                |    P2    |
| **Integration Tests** | None for MCP lifecycle inside executeAgentBlock | Close-error `finally` branch (lines 247-256) never entered (`mcpServers: []`)                |    P2    |
| **Edge Cases**        | None                                            | A client whose `.close()` rejects should be caught per-client without aborting others/result |    P2    |

---

## TDD Implementation Workflow

|            Step            | Status/Details                                                          |                       Universal Check                        |
| :------------------------: | :---------------------------------------------------------------------- | :----------------------------------------------------------: |
| **1. Write Failing Tests** | Add tool-binding + MCP close-error tests                                |        - [ ] Failing tests are written and committed.        |
|   **2. Implement Code**    | Likely none — assertions only (or fake-agent tweak to invoke `execute`) |    - [ ] Minimal code to make tests pass is implemented.     |
|  **3. Verify Tests Pass**  | Run runtime-core suite from repo root                                   |               - [ ] All new tests are passing.               |
|      **4. Refactor**       | N/A unless test helpers extracted                                       | - [ ] Code is refactored for quality (or N/A is documented). |
|  **5. Regression Check**   | runtime-core 223/223 baseline                                           |      - [ ] Full test suite passes with no regressions.       |

### Test Cases Defined

| Test Case # | Description                                                                        | Input                             | Expected Output                                                        |   Status    |
| :---------: | :--------------------------------------------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------- | :---------: |
|    **1**    | Assert `add_code_block.execute === context.addAndExecuteCodeBlock`                 | captured tools settings           | identity holds                                                         | Not Started |
|    **2**    | Assert `add_markdown_block.execute === context.addMarkdownBlock`                   | captured tools settings           | identity holds                                                         | Not Started |
|    **3**    | Drive executeAgentBlock with non-empty `mcpServers`; one client `.close()` rejects | rejecting client + healthy client | error caught per-client; other clients still closed; result unaffected | Not Started |
|    **4**    | Non-empty `mcpServers` happy path closes all clients                               | two healthy clients               | both `.close()` called, no throw                                       | Not Started |

#### Test Implementation Notes (Optional)

> Prefer asserting on `captured.settings.tools` for the binding gap; for the MCP gap, inject fake clients whose `.close()` resolves/rejects and assert the `finally` branch behavior.

```python
# (Tests are TypeScript/vitest; placeholder retained for template conformance.)
def test_placeholder():
    pass
```

---

## Test Execution & Verification

| Iteration # | Test Batch              | Action Taken | Outcome |
| :---------: | :---------------------- | :----------- | :------ |
|    **1**    | Binding + MCP tests     | Pending      | Pending |
|    **2**    | After any helper tweaks | Pending      | Pending |
|    **3**    | Full regression         | Pending      | Pending |

---

#### Iteration 1: Initial Test Run

**Test Batch:** Test cases 1-4

**Action Taken:** Pending

**Outcome:** Pending

---

#### Iteration 2: Post-Implementation Verification

**Test Batch:** Same cases after any code/helper change

**Action Taken:** Pending

**Outcome:** Pending

---

## Coverage Verification

| Metric              |                Before                 |    After     | Target Met? |
| :------------------ | :-----------------------------------: | :----------: | :---------: |
| **Line Coverage**   | tool bindings + MCP finally uncovered | both covered |      N      |
| **Branch Coverage** |     close-error branch uncovered      |   covered    |      N      |
| **Test Count**      |          41 (agent-handler)           |     +>=4     |      N      |

- [ ] Coverage report generated and reviewed.
- [ ] All critical paths are now tested.
- [ ] Edge cases identified in assessment are covered.

---

## Completion & Follow-up

| Task                   | Detail/Link |
| :--------------------- | :---------- |
| **Code Review**        | Pending     |
| **CI/CD Verification** | Pending     |
| **Coverage Report**    | Pending     |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                                           |
| :-------------------------- | :--------------------------------------------------------------------------------- |
| **Similar Gaps Elsewhere?** | Check other executor paths that replay fixtures instead of invoking callbacks      |
| **Process Improvement**     | When fakes replay recorded parts, add a binding-identity assertion to guard wiring |
| **Future Refactoring**      | N/A                                                                                |
| **Documentation Updates**   | N/A                                                                                |

### Completion Checklist

- [ ] All test cases defined in the table are implemented.
- [ ] All tests are passing.
- [ ] Code coverage meets or exceeds target for this component.
- [ ] Full regression suite passes with no failures.
- [ ] Code is refactored and clean.
- [ ] Changes are committed and pushed.
- [ ] Follow-up actions are documented or tickets created.
- [ ] Original work (feature/bug) can be resumed with confidence.

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
